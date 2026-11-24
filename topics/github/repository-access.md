---
title: Who can do what in a GitHub repository
area: github
created: 2026-11-08
updated: 2026-11-08
prerequisites: []
related: [android/app-signing]
projects: [skip-the-fluff]
tags: [github, permissions, collaborators, secrets, environments, github-actions]
---

# Who can do what in a GitHub repository

## TL;DR

- **Public** means anyone can read, fork, open issues and pull requests, and comment. It does **not** mean anyone can push.
- A repository owned by a **personal account** knows only the owner and **collaborators**, and every collaborator can push. The finer roles (Read, Triage, Write, Maintain, Admin) exist only in repositories owned by an **organisation**.
- **Write access is access to the secrets.** A collaborator can push a branch with a changed workflow that uses them.
- Workflows started by a **pull request from a fork** (`pull_request` event) get no secrets, so strangers can't reach them that way.
- **Environment secrets** reach only jobs that name the environment, and only after its protection rules pass, such as a required reviewer's approval.
- A stored secret can never be **read back**, so GitHub is not a backup.

## Key claims

- <a id="c1"></a>**C1.** In a public repository, by default anyone with a GitHub account can read the code, fork it, open issues and pull requests, and comment. Only accounts given write access can push branches or tags to the repository itself.
- <a id="c2"></a>**C2.** A repository owned by a personal account has two permission levels: the owner and collaborators. Every collaborator can push. The roles Read, Triage, Write, Maintain and Admin exist only for repositories owned by an organisation.
- <a id="c3"></a>**C3.** An invitation to collaborate grants nothing until the invitee accepts it. The owner can withdraw it before then.
- <a id="c4"></a>**C4.** A workflow run on the `pull_request` event for a pull request from a fork receives no repository or environment secrets, and its `GITHUB_TOKEN` can only read. The `pull_request_target` event is the exception: it runs the base repository's workflow with its secrets.
- <a id="c5"></a>**C5.** An account that can push to a repository can run a workflow it changed on its own branch. Every repository secret is therefore within reach of every account with write access.
- <a id="c6"></a>**C6.** An environment secret is available only to a job that references the environment. If the environment requires reviewers, the job waits and gets the secret only after one of them approves the run.
- <a id="c7"></a>**C7.** A secret stored in GitHub cannot be displayed again, through the website or the API. Workflows can use it, but nobody can read it back. It is therefore no backup of the value.

## Explanation

### Reading is open, pushing is granted

"Public" describes who can *see* a repository ([C1](#c1)). Anyone can copy it into a fork and propose changes from there through a pull request. Those changes only reach the repository when someone with write access merges them. In .NET terms, a public repository is like a NuGet package's source on GitHub: everyone can read it and suggest a change, but only the maintainers can publish.

### Personal accounts have no fine roles

GitHub offers graded roles, so that someone can manage issues (Triage) without pushing code. These roles exist only in organisations ([C2](#c2)). On a personal account, inviting a collaborator means giving them push access. Someone who only needs to comment needs no invitation at all on a public repository ([C1](#c1)). Until an invitation is accepted, it grants nothing and can be withdrawn ([C3](#c3)).

### Why write access reaches the secrets

A workflow is a file in the repository. Whoever can push can change that file on a branch, and the changed workflow runs with the repository's secrets ([C5](#c5)). So protecting a secret means limiting who has write access. Pull requests from forks are safe in this respect. GitHub runs their `pull_request` workflows without secrets and with a read-only token ([C4](#c4)), precisely because anyone can open one. The `pull_request_target` event deliberately runs the workflow as it is on the base branch, with secrets. That is only safe as long as the workflow never runs code from the pull request.

### Environments narrow it down

An *environment* is a named target such as `release`, with its own secrets and protection rules. A job gets an environment's secrets only if it names that environment. With a required reviewer, the job pauses until a listed person approves that run ([C6](#c6)). An approval rule protects even against a collaborator who changed the workflow. The reviewer still has to look at what they approve.

### Secrets are write-only

GitHub shows only a secret's name once it is stored ([C7](#c7)). That keeps the value from leaking through the website. It also means the original value must be kept somewhere else, if losing it would hurt.

## Examples

How [Skip the Fluff](https://github.com/thomaswening/skip-the-fluff) protects its app-signing key ([ADR-0005](https://github.com/thomaswening/skip-the-fluff/blob/main/docs/adr/0005-signing-key.md)):

- **An environment:** the key is a secret of the `release` environment. Thomas is the required reviewer, and only `v*` tags may use it ([C6](#c6)).
- **No needless write access:** Claude's account, `claudinius`, had a pending invitation with write access. The repository is owned by a personal account, so there was no Triage role to give instead ([C2](#c2)). The invitation was withdrawn ([C3](#c3)). Commenting on pull requests needs no access on a public repository ([C1](#c1)).
- **Backups off GitHub:** two copies of the key are kept elsewhere ([C7](#c7)).

A job that uses an environment names it:

```yaml
jobs:
  sign:
    runs-on: ubuntu-latest
    environment: release   # waits for the required reviewer's approval
    steps:
      - run: echo "the secret is available from here on"
        env:
          KEYSTORE: ${{ secrets.RELEASE_KEYSTORE_BASE64 }}
```

## Pitfalls

- **"Public" read as "anyone can change it".** Reading and forking are open. Pushing is not ([C1](#c1)).
- **Looking for a narrower role on a personal repository.** There is none. Leave the person out, or move the repository to an organisation ([C2](#c2)).
- **Inviting a helper account "just to comment".** On a public repository it needs no access. An accepted invitation would hand it the secrets ([C5](#c5)).
- **Using `pull_request_target` and checking out the pull request's code.** The stranger's code then runs with the secrets ([C4](#c4)).
- **Approving an environment run without looking.** The approval is the protection ([C6](#c6)).
- **Treating a GitHub secret as the safe copy.** It cannot be read back ([C7](#c7)).

## Sources

- Claude session on Skip the Fluff, 2026-11-08: [ADR-0005](https://github.com/thomaswening/skip-the-fluff/blob/main/docs/adr/0005-signing-key.md) and its review in [PR #9](https://github.com/thomaswening/skip-the-fluff/pull/9).
- GitHub Docs: [Permission levels for a personal account repository](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-personal-account-settings/permission-levels-for-a-personal-account-repository).
- GitHub Docs: [Repository roles for an organization](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization).
- GitHub Docs: [Using secrets in GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions).
- GitHub Docs: [Managing environments for deployment](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-deployments/managing-environments-for-deployment).
