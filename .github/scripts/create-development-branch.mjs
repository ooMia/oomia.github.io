#!/usr/bin/env node

const API_URL = "https://api.github.com/graphql";

function fail(message) {
  console.error(`::error::${String(message).replaceAll("\n", "%0A")}`);
  process.exit(1);
}

async function graphql(token, query, variables = {}) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "user-agent": "publishing-platform-linked-branch",
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    throw new Error(payload.errors?.map((e) => e.message).join("; ") || response.statusText);
  }
  return payload.data;
}

function splitRepo(fullName) {
  const [owner, repo] = String(fullName ?? "").split("/");
  if (!owner || !repo) throw new Error(`Invalid repository: ${fullName}`);
  return { owner, repo };
}

function parseSeed(body) {
  const match = String(body ?? "").match(/<!--\s*project-seed\s*([\s\S]*?)-->/i);
  if (!match) return {};
  try {
    return JSON.parse(match[1].trim());
  } catch (error) {
    throw new Error(`Invalid project-seed JSON: ${error.message}`);
  }
}

function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);
}

function branchName(issue, seed) {
  if (seed.branch) return seed.branch;
  const title = issue.title.replace(/^draft:\s*/i, "").trim();
  const conventional = title.match(/^(feat|fix|chore|docs|refactor|test|experiment):\s*(.+)$/i);
  if (conventional) return `${issue.number}-${conventional[1].toLowerCase()}-${slugify(conventional[2])}`;
  return `${issue.number}-${slugify(title)}`;
}

async function fetchContext(token, repository, issueNumber, baseBranch, branch) {
  const { owner, repo } = splitRepo(repository);
  const data = await graphql(token, `
    query($owner: String!, $repo: String!, $number: Int!, $base: String!, $branch: String!) {
      repository(owner: $owner, name: $repo) {
        id
        base: ref(qualifiedName: $base) { target { oid } }
        branch: ref(qualifiedName: $branch) { name }
        issue(number: $number) {
          id number title body state
          linkedBranches(first: 100) {
            nodes { ref { name repository { nameWithOwner } } }
          }
        }
      }
    }
  `, {
    owner,
    repo,
    number: issueNumber,
    base: `refs/heads/${baseBranch}`,
    branch: `refs/heads/${branch}`,
  });
  if (!data.repository?.issue) throw new Error(`Issue #${issueNumber} not found in ${repository}`);
  if (!data.repository.base?.target?.oid) throw new Error(`Base branch not found: ${baseBranch}`);
  return data.repository;
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const issueNumber = Number(process.env.ISSUE_NUMBER);
  const baseBranch = process.env.DEVELOPMENT_BASE ?? "main";

  if (!token) throw new Error("GITHUB_TOKEN is required.");
  if (!repository || !Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new Error("GITHUB_REPOSITORY and positive ISSUE_NUMBER are required.");
  }

  const preliminary = await fetchContext(token, repository, issueNumber, baseBranch, "__issue_branch_probe__");
  const issue = preliminary.issue;
  if (issue.state !== "OPEN" || /^draft:\s*/i.test(issue.title)) {
    console.log("Issue is not active; Development branch creation skipped.");
    return;
  }

  const seed = parseSeed(issue.body);
  if (seed.development === false) {
    console.log("project-seed.development=false; Development branch creation skipped.");
    return;
  }

  const name = branchName(issue, seed);
  const context = await fetchContext(token, repository, issueNumber, baseBranch, name);
  const linked = context.issue.linkedBranches.nodes.some((node) =>
    node.ref?.name === name &&
    node.ref?.repository?.nameWithOwner?.toLowerCase() === repository.toLowerCase()
  );

  if (linked) {
    console.log(`Development branch already linked: ${name}`);
    return;
  }
  if (context.branch) {
    throw new Error(`Branch ${name} already exists but is not linked to Issue #${issueNumber}. Resolve this one-time migration manually.`);
  }

  const data = await graphql(token, `
    mutation($issue: ID!, $repository: ID!, $oid: GitObjectID!, $name: String!) {
      createLinkedBranch(input: {
        issueId: $issue
        repositoryId: $repository
        oid: $oid
        name: $name
      }) {
        linkedBranch { ref { name } }
      }
    }
  `, {
    issue: context.issue.id,
    repository: context.id,
    oid: context.base.target.oid,
    name,
  });

  console.log(`Created linked Development branch: ${data.createLinkedBranch.linkedBranch.ref.name}`);
}

main().catch((error) => fail(error.stack ?? error.message ?? String(error)));
