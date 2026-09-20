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
      "user-agent": "publishing-platform-project-sync",
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

async function fetchIssue(token, repository, number) {
  const { owner, repo } = splitRepo(repository);
  const data = await graphql(token, `
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $number) { id number title body state }
      }
    }
  `, { owner, repo, number });
  if (!data.repository?.issue) throw new Error(`Issue #${number} not found in ${repository}`);
  return data.repository.issue;
}

async function fetchProject(token, owner, number) {
  const data = await graphql(token, `
    query($owner: String!, $number: Int!) {
      user(login: $owner) {
        projectV2(number: $number) {
          id
          title
          fields(first: 100) {
            nodes {
              __typename
              ... on ProjectV2FieldCommon { id name dataType }
              ... on ProjectV2SingleSelectField { options { id name } }
              ... on ProjectV2MultiSelectField { multiSelectOptions { id name } }
              ... on ProjectV2IterationField {
                configuration {
                  iterations { id title }
                  completedIterations { id title }
                }
              }
            }
          }
        }
      }
    }
  `, { owner, number });
  if (!data.user?.projectV2) throw new Error(`Project not found: ${owner}/projects/${number}`);
  return data.user.projectV2;
}

async function addItem(token, projectId, contentId) {
  const data = await graphql(token, `
    mutation($project: ID!, $content: ID!) {
      addProjectV2ItemById(input: { projectId: $project, contentId: $content }) {
        item { id }
      }
    }
  `, { project: projectId, content: contentId });
  return data.addProjectV2ItemById.item.id;
}

function optionId(options, wanted, fieldName) {
  const match = options.find((option) => option.name.toLowerCase() === String(wanted).toLowerCase());
  if (!match) {
    throw new Error(`Field "${fieldName}" has no option "${wanted}". Available: ${options.map((x) => x.name).join(", ")}`);
  }
  return match.id;
}

function makeFieldValue(field, wanted) {
  if (wanted == null || wanted === "" || (Array.isArray(wanted) && wanted.length === 0)) return null;

  if (field.__typename === "ProjectV2SingleSelectField") {
    const value = Array.isArray(wanted) ? wanted[0] : wanted;
    return { singleSelectOptionId: optionId(field.options, value, field.name) };
  }

  if (field.__typename === "ProjectV2MultiSelectField") {
    const values = Array.isArray(wanted) ? wanted : [wanted];
    return { multiSelectOptionIds: values.map((value) => optionId(field.multiSelectOptions, value, field.name)) };
  }

  if (field.__typename === "ProjectV2IterationField") {
    const iterations = [...field.configuration.iterations, ...field.configuration.completedIterations]
      .map(({ id, title }) => ({ id, name: title }));
    return { iterationId: optionId(iterations, wanted, field.name) };
  }

  if (field.__typename === "ProjectV2Field" && field.dataType === "TEXT") {
    return { text: Array.isArray(wanted) ? wanted.join(", ") : String(wanted) };
  }

  throw new Error(`Unsupported field type for "${field.name}": ${field.__typename}/${field.dataType}`);
}

async function updateField(token, projectId, itemId, fieldId, value) {
  await graphql(token, `
    mutation($project: ID!, $item: ID!, $field: ID!, $value: ProjectV2FieldValue!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $project
        itemId: $item
        fieldId: $field
        value: $value
      }) { projectV2Item { id } }
    }
  `, { project: projectId, item: itemId, field: fieldId, value });
}

async function main() {
  const token = process.env.PROJECT_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const issueNumber = Number(process.env.ISSUE_NUMBER);
  const projectOwner = process.env.PROJECT_OWNER ?? "ooMia";
  const projectNumber = Number(process.env.PROJECT_NUMBER ?? "11");

  if (!token) throw new Error("PROJECT_TOKEN is required. Store a classic PAT with repo + project scopes as this repository secret.");
  if (!repository || !Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new Error("GITHUB_REPOSITORY and positive ISSUE_NUMBER are required.");
  }

  const issue = await fetchIssue(token, repository, issueNumber);
  if (issue.state !== "OPEN" || /^draft:\s*/i.test(issue.title)) {
    console.log("Issue is not active; Project sync skipped.");
    return;
  }

  const seed = parseSeed(issue.body);
  const project = await fetchProject(token, projectOwner, projectNumber);
  const itemId = await addItem(token, project.id, issue.id);

  const desired = new Map([
    ["Status", seed.status ?? "Todo"],
    ["Iteration", seed.iteration],
    ["Work Type", seed.workType],
    ["Scope", seed.scope],
    ["Objective", seed.objective],
    ["Target Release", seed.targetRelease],
  ]);

  for (const [fieldName, wanted] of desired) {
    if (wanted == null || wanted === "" || (Array.isArray(wanted) && wanted.length === 0)) continue;
    const field = project.fields.nodes.find((candidate) => candidate?.name === fieldName);
    if (!field) throw new Error(`Project field not found: ${fieldName}`);
    await updateField(token, project.id, itemId, field.id, makeFieldValue(field, wanted));
    console.log(`${fieldName}: ${Array.isArray(wanted) ? wanted.join(", ") : wanted}`);
  }

  console.log(`Synchronized ${repository}#${issue.number} with ${projectOwner}/projects/${projectNumber}.`);
}

main().catch((error) => fail(error.stack ?? error.message ?? String(error)));
