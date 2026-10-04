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
      "user-agent": "publishing-platform-project-commitment",
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();

  if (!response.ok || payload.errors?.length) {
    throw new Error(
      payload.errors?.map((error) => error.message).join("; ") ||
        response.statusText
    );
  }

  return payload.data;
}

async function main() {
  const token = process.env.PROJECT_TOKEN;
  const owner = process.env.PROJECT_OWNER ?? "ooMia";
  const projectNumber = Number(process.env.PROJECT_NUMBER ?? "11");
  const repository = process.env.GITHUB_REPOSITORY;
  const issueNumber = Number(process.env.ISSUE_NUMBER);
  const iterationTitle = process.env.ITERATION_TITLE;
  const statusName = process.env.STATUS_NAME ?? "Todo";

  if (!token) throw new Error("PROJECT_TOKEN is required.");
  if (!repository) throw new Error("GITHUB_REPOSITORY is required.");
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new Error("Positive ISSUE_NUMBER is required.");
  }
  if (!iterationTitle) throw new Error("ITERATION_TITLE is required.");

  const [repoOwner, repoName] = repository.split("/");

  const data = await graphql(
    token,
    `
      query (
        $owner: String!
        $projectNumber: Int!
        $repoOwner: String!
        $repoName: String!
        $issueNumber: Int!
      ) {
        user(login: $owner) {
          projectV2(number: $projectNumber) {
            id
            fields(first: 100) {
              nodes {
                __typename
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  options { id name }
                }
                ... on ProjectV2IterationField {
                  id
                  name
                  configuration {
                    iterations { id title }
                    completedIterations { id title }
                  }
                }
              }
            }
          }
        }
        repository(owner: $repoOwner, name: $repoName) {
          issue(number: $issueNumber) {
            id
            projectItems(first: 100, includeArchived: true) {
              nodes {
                id
                isArchived
                project { id }
              }
            }
          }
        }
      }
    `,
    { owner, projectNumber, repoOwner, repoName, issueNumber }
  );

  const project = data.user?.projectV2;
  const issue = data.repository?.issue;

  if (!project) throw new Error("Project not found.");
  if (!issue) throw new Error(`Issue #${issueNumber} not found.`);

  const item = issue.projectItems.nodes.find(
    (candidate) => candidate.project?.id === project.id
  );

  if (!item) throw new Error("Issue is not admitted to the target Project.");
  if (item.isArchived) throw new Error("Project item is archived.");

  const statusField = project.fields.nodes.find(
    (field) =>
      field?.__typename === "ProjectV2SingleSelectField" &&
      field.name === "Status"
  );
  const iterationField = project.fields.nodes.find(
    (field) =>
      field?.__typename === "ProjectV2IterationField" &&
      field.name === "Iteration"
  );

  if (!statusField) throw new Error("Status field not found.");
  if (!iterationField) throw new Error("Iteration field not found.");

  const status = statusField.options.find(
    (option) => option.name.toLowerCase() === statusName.toLowerCase()
  );
  const iterations = [
    ...iterationField.configuration.iterations,
    ...iterationField.configuration.completedIterations,
  ];
  const iteration = iterations.find(
    (candidate) => candidate.title === iterationTitle
  );

  if (!status) throw new Error(`Status option not found: ${statusName}`);
  if (!iteration) {
    throw new Error(`Iteration option not found: ${iterationTitle}`);
  }

  for (const update of [
    {
      field: statusField.id,
      value: { singleSelectOptionId: status.id },
    },
    {
      field: iterationField.id,
      value: { iterationId: iteration.id },
    },
  ]) {
    await graphql(
      token,
      `
        mutation (
          $project: ID!
          $item: ID!
          $field: ID!
          $value: ProjectV2FieldValue!
        ) {
          updateProjectV2ItemFieldValue(
            input: {
              projectId: $project
              itemId: $item
              fieldId: $field
              value: $value
            }
          ) {
            projectV2Item { id }
          }
        }
      `,
      {
        project: project.id,
        item: item.id,
        field: update.field,
        value: update.value,
      }
    );
  }

  console.log(
    `Committed ${repository}#${issueNumber} to ${iterationTitle} as ${statusName}.`
  );
}

main().catch((error) => fail(error.stack ?? error.message ?? String(error)));
