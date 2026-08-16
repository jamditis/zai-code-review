# Z.ai Code Review

Run a GLM code review on each GitHub pull request. The action sends the GitHub patch to the Z.ai Coding Plan endpoint. It then creates or updates one pull request comment.

## Use the action

After the maintainer publishes a release, replace `<release-tag>` with its tag.

```yaml
name: GLM code review

on:
  pull_request:
    types: [opened, reopened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Review the pull request
        uses: tarmojussila/zai-code-review@<release-tag>
        with:
          ZAI_API_KEY: ${{ secrets.ZAI_API_KEY }}
```

The action uses `glm-5.3` by default. It calls the Z.ai Coding Plan OpenAI Chat Completions endpoint.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `ZAI_API_KEY` | Yes | — | Z.ai API key. Store it as a GitHub Actions secret. |
| `ZAI_MODEL` | No | `glm-5.3` | GLM model for the review. |
| `ZAI_SYSTEM_PROMPT` | No | See `action.yml` | Review instruction for the model. |
| `ZAI_REVIEWER_NAME` | No | `Z.ai Code Review` | Heading for the pull request comment. |
| `ZAI_REASONING_EFFORT` | No | `high` | `low`, `medium`, `high`, or `max` for GLM-5.2 and newer. |
| `EXCLUDE_PATTERNS` | No | Lock file patterns | Comma-separated file patterns to exclude. |
| `MAX_DIFF_CHARS` | No | `120000` | Maximum diff characters sent to Z.ai. Set `0` for no limit. |
| `MAX_OUTPUT_TOKENS` | No | `4096` | Maximum tokens in the review response. |
| `GITHUB_TOKEN` | No | `${{ github.token }}` | Token used to read the pull request and write its comment. |

The action sends `reasoning_effort` only for GLM-5.2 and newer. It does not send that field for older GLM models.

## Outputs

| Output | Description |
| --- | --- |
| `comment-id` | GitHub ID for the review comment. |
| `reviewed-file-count` | Number of files with a patch sent to Z.ai. |
| `omitted-file-count` | Number of files with no GitHub patch, a truncated patch, or an excluded patch. |

## Review limits

GitHub does not supply a patch for all files. Binary files and very large files can have no patch. The action reports those files in its review comment.

The default diff limit prevents a large pull request from exceeding the model input limit. The action truncates one patch when needed. It then skips later patches. The review comment states when this happens.

The action retries rate-limit and server errors twice. It limits a response to 1 MiB. It also limits the GitHub comment to 60,000 characters.

## Security

Use `pull_request`, as shown above. Do not change the workflow to `pull_request_target`. That event can expose `ZAI_API_KEY` to untrusted pull request code.

GitHub does not provide repository secrets to workflows that external contributors trigger. Review those pull requests only after their changes are in a trusted branch or through a separate approved review process.

## Development

Node.js 24 is the action runtime.

```bash
npm install
npm test
npm run build
```

Commit changes to `src/`, `dist/`, and `dist/licenses.txt` when the bundle changes. See [CONTRIBUTING](CONTRIBUTING.md) for the pull request process.

## License

This project uses the [MIT License](LICENSE).
