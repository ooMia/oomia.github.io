#!/usr/bin/env node

import { assertDevelopmentStartAllowed } from "./orchestration-policy.mjs";

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
    throw new Error(
      payload.errors?.map((e) => e.message).join("; ") || response.statusText
    );
  }
  return payload.data;
}

function splitRepo(fullName) {
  const [owner, repo] = String(fullName ?? "").split("/");
  if (!owner || !repo) throw new Error(`Invalid repository: ${fullName}`);
  return { owner, repo };
}

function parseSeed(body) {
  const match = String(body ?? "").match(
    /<!--\s*project-seed\s*([\s\S]*?)-->/i
  );
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
  const conventional = title.match(
    /^(feat|fix|chore|docs|refactor|test|experiment|maintenance|investigation):\s*(.+)$/i
  );
  if (conventional)
    return `${issue.number}-${conventional[1].toLowerCase()}-${slugify(conventional[2])}`;
  return `${issue.number}-${slugify(title)}`;
}

async function fetchContext(
  token,
  repository,
  issueNumber,
  baseBranch,
  branch
) {
  const { owner, repo } = splitRepo(repository);
  const data = await graphql(
    token,
    `
      query (
        $owner: String!
        $repo: String!
        $number: Int!
        $base: String!
        $branch: String!
      ) {
        repository(owner: $owner, name: $repo) {
          id
          base: ref(qualifiedName: $base) {
            target {
              oid
            }
          }
          branch: ref(qualifiedName: $branch) {
            name
          }
          issue(number: $number) {
            id
            number
            title
            body
            state
            linkedBranches(first: 100) {
              nodes {
                ref {
                  name
                  repository {
                    nameWithOwner
                  }
                }
              }
            }
          }
        }
      }
    `,
    {
      owner,
      repo,
      number: issueNumber,
      base: `refs/heads/${baseBranch}`,
      branch: `refs/heads/${branch}`,
    }
  );
  if (!data.repository?.issue)
    throw new Error(`Issue #${issueNumber} not found in ${repository}`);
  if (!data.repository.base?.target?.oid)
    throw new Error(`Base branch not found: ${baseBranch}`);
  return data.repository;
}

async function fetchProject(token, owner, number) {
  const data = await graphql(
    token,
    `
      query ($owner: String!, $number: Int!) {
        user(login: $owner) {
          projectV2(number: $number) {
            id
            fields(first: 100) {
              nodes {
                __typename
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  options {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }
    `,
    { owner, number }
  );

  const project = data.user?.projectV2;
  if (!project)\n    throw new Error(`Project not found: ${owner}/projects/${number}`);

  const statusField = project.fields.nodes.find(
    (field) =>
      field?.__typename === "ProjectV2SingleSelectField" &&
      field.name === "Status"
  );
  if (!statusField) throw new Error("Project Status field not found.");

  return { ...project, statusField };
}

async function findProjectItem(token, issueId, projectId) {
  let after = null;

  do {
    const data = await graphql(
      token,
      `
        query ($issue: ID!, $after: String) {
          node(id: $issue) {
            ... on Issue {
              projectItems(first: 100, after: $after, includeArchived: true) {
                nodes {
                  id
                  isArchived
                  project {
                    id
                  }
                  status: fieldValueByName(name: "Status") {
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                    }
                  }
                  iteration: fieldValueByName(name: "Iteration") {
                    ... on ProjectV2ItemFieldIterationValue {
                      iterationId
                    }
                  }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          }
        }
      `,
      { issue: issueId, after }
    );

    const items = data.node?.projectItems;
    if (!items) throw new Error("Cannot verify Project membership.");

    const matches = items.nodes.filter(\n      (item) => item.project?.id === projectId\n    );
    if (matches.length > 1) {
      throw new Error("Issue has multiple items in the same Project.");
    }
    if (matches.length === 1) return matches[0];

    if (!items.pageInfo.hasNextPage) return null;
    if (!items.pageInfo.endCursor || items.pageInfo.endCursor === after) {
      throw new Error("Invalid Project membership pagination.");
    }
    after = items.pageInfo.endCursor;
  } while (after);

  return null;
}

function statusOptionId(field, wanted) {
  const option = field.options.find(
    (candidate) => candidate.name.toLowerCase() === String(wanted).toLowerCase()
  );
  if (!option) {
    throw new Error(
      `Status has no option "${wanted}". Available: ${field.options
        .map((candidate) => candidate.name)
        .join(", ")}`
    );
  }
  return option.id;
}

async function updateProjectStatus(token, project, itemId, status) {
  const optionId = statusOptionId(project.statusField, status);

  await graphql(
    token,
    `
      mutation ($project: ID!, $item: ID!, $field: ID!, $option: String!) {
        updateProjectV2ItemFieldValue(
          input: {
            projectId: $project
            itemId: $item
            fieldId: $field
            value: { singleSelectOptionId: $option }
          }
        ) {
          projectV2Item {
            id
          }
        }
      }
    `,
    {
      project: project.id,
      item: itemId,
      field: project.statusField.id,
      option: optionId,
    }
  );
}

function repositoryLinkedBranches(issue, repository) {
  return issue.linkedBranches.nodes.filter(
    (node) =>
      node.ref?.repository?.nameWithOwner?.toLowerCase() ===
      repository.toLowerCase()
  );
}

async function createLinkedDevelopmentBranch(token, context, name) {
  const data = await graphql(
    token,
    `
      mutation (
        $issue: ID!
        $repository: ID!
        $oid: GitObjectID!
        $name: String!
      ) {
        createLinkedBranch(
          input: {
            issueId: $issue
            repositoryId: $repository
            oid: $oid
            name: $name
          }
        ) {
          linkedBranch {
            ref {
              name
            }
          }
        }
      }
    `,
    {
      issue: context.issue.id,
      repository: context.id,
      oid: context.base.target.oid,
      name,
    }
  );

  return data.createLinkedBranch.linkedBranch.ref.name;
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const projectToken = process.env.PROJECT_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const issueNumber = Number(process.env.ISSUE_NUMBER);
  const baseBranch = process.env.DEVELOPMENT_BASE ?? "main";
  const projectOwner = process.env.PROJECT_OWNER ?? "ooMia";
  const projectNumber = Number(process.env.PROJECT_NUMBER ?? "11");

  if (!token) throw new Error("GITHUB_TOKEN is required.");
  if (!projectToken) throw new Error("PROJECT_TOKEN is required.");
  if (!repository || !Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new Error(
      "GITHUB_REPOSITORY and positive ISSUE_NUMBER are required."
    );
  }

  const preliminary = await fetchContext(
    token,
    repository,
    issueNumber,
    baseBranch,
    "__issue_branch_probe__"
  );
  const issue = preliminary.issue;

  if (issue.state !== "OPEN") {
    throw new Error("Issue must be open before Development start.");
  }
  if (/^draft:\s*/i.test(issue.title)) {
    throw new Error("Draft Issue cannot start Development.");
  }

  const seed = parseSeed(issue.body);
  if (seed.development === false) {
    throw new Error(
      "project-seed.development=false; this Issue does not allow a Development branch."
    );
  }

  const project = await fetchProject(projectToken, projectOwner, projectNumber);
  const initialItem = await findProjectItem(projectToken, issue.id, project.id);
  if (!initialItem) {
    throw new Error(
      `Issue #${issueNumber} must be admitted to Project #${projectNumber} before Development start.`
    );
  }

  assertDevelopmentStartAllowed({
    iteration: initialItem.iteration?.iterationId,
    status: initialItem.status?.name,
    isArchived: initialItem.isArchived,
  });

  const proposedName = branchName(issue, seed);
  const context = await fetchContext(
    token,
    repository,
    issueNumber,
    baseBranch,
    proposedName
  );
  const linked = repositoryLinkedBranches(context.issue, repository);

  if (linked.length > 1) {
    throw new Error(
      `Issue #${issueNumber} has multiple linked Development branches in ${repository}; review manually.`
    );
  }

  let developmentBranch = linked[0]?.ref?.name ?? null;

  if (!developmentBranch) {
    if (context.branch) {
      throw new Error(
        `Branch ${proposedName} already exists but is not linked to Issue #${issueNumber}. Resolve this one-time migration manually.`
      );
    }
    developmentBranch = await createLinkedDevelopmentBranch(
      token,
      context,
      proposedName
    );
    console.log(`Created linked Development branch: ${developmentBranch}`);
  } else {
    console.log(`Development branch already linked: ${developmentBranch}`);
  }

  const linkedContext = await fetchContext(
    token,
    repository,
    issueNumber,
    baseBranch,
    proposedName
  );
  const verifiedLinks = repositoryLinkedBranches(
    linkedContext.issue,
    repository
  );
  if (!verifiedLinks.some((node) => node.ref?.name === developmentBranch)) {
    throw new Error("Development relation verification failed.");
  }

  const beforeStatus = await findProjectItem(
    projectToken,
    issue.id,
    project.id
  );
  if (!beforeStatus) throw new Error("Project item disappeared during start.");
  if (
    beforeStatus.iteration?.iterationId !== initialItem.iteration?.iterationId
  ) {
    throw new Error("Iteration commitment changed during Development start.");
  }

  assertDevelopmentStartAllowed({
    iteration: beforeStatus.iteration?.iterationId,
    status: beforeStatus.status?.name,
    isArchived: beforeStatus.isArchived,
  });

  if (String(beforeStatus.status?.name ?? "").toLowerCase() !== "in progress") {
    await updateProjectStatus(
      projectToken,
      project,
      beforeStatus.id,
      "In progress"
    );
  }

  const verifiedItem = await findProjectItem(
    projectToken,
    issue.id,
    project.id
  );
  if (
    !verifiedItem ||
    verifiedItem.isArchived ||
    verifiedItem.iteration?.iterationId !==
      initialItem.iteration?.iterationId ||
    String(verifiedItem.status?.name ?? "").toLowerCase() !== "in progress"
  ) {
    throw new Error("Development start Project verification failed.");
  }

  console.log(
    `Development started for ${repository}#${issueNumber}: branch=${developmentBranch}, status=In progress.`
  );
}

main().catch((error) => fail(error.stack ?? error.message ?? String(error)));
