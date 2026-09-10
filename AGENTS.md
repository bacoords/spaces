# AGENTS.md

## Repository purpose

This public repository is the source for Brian Coords' collection of small static projects hosted together on Spacefast.

- GitHub repository: <https://github.com/bacoords/spaces>
- Production branch: `main`
- Production base URL: <https://spaces.briancoords.com/>
- Each project lives in one top-level folder and is served at `https://spaces.briancoords.com/<folder-name>/`.
- Example: `code-editor-typing-demo/index.html` is served at <https://spaces.briancoords.com/code-editor-typing-demo/>.

Spacefast is connected to the GitHub repository. A push to `origin/main` publishes the repository as a new production version. Treat the repository root as the publish root and the whole repository as one atomic site snapshot.

## Project layout

Create every project as a self-contained top-level directory:

```text
spaces/
├── AGENTS.md
├── index.html
├── code-editor-typing-demo/
│   └── index.html
└── my-new-project/
    ├── index.html
    ├── styles.css
    ├── app.js
    └── assets/
```

Follow these rules:

- Use a short, descriptive, lowercase kebab-case folder name. The folder name becomes the public URL path, so do not rename it casually.
- Every project must contain an `index.html` at its folder root.
- Keep the root `index.html` directory accurate. Add, update, or remove its project entry and space count whenever the top-level project folders change.
- Keep each project's HTML, CSS, JavaScript, images, fonts, and other assets inside that project's folder.
- Prefer relative asset and navigation URLs such as `./styles.css`, `assets/icon.svg`, and `../other-project/`. Root-absolute URLs such as `/styles.css` resolve from `spaces.briancoords.com`, not from the project folder, and usually break the project.
- Configure frameworks and routers with the matching base path (`/<folder-name>/`) and commit static output that works from that path. This repository is for static hosting, not server-side runtimes.
- The root `index.html` is reserved for the public directory. Do not add a second project at the repository root. Do not change the Spacefast build root or output directory to one project's folder; that would exclude the other projects from the published snapshot.
- Root-level Spacefast files such as `sf.jsonc`, `_redirects`, and `_headers` affect the shared deployment. Do not add or change them for one project without checking the impact on every folder.
- Preserve unrelated project folders. Removing a tracked folder from `main` removes it from the next published version.
- Assume every committed file is public. Never commit API keys, space keys, signed Spacefast remote URLs, `.env` files, credentials, or private data.

## Local verification

Run any project-specific tests or build commands first. Then serve the repository root so the local path matches production:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/<folder-name>/` and verify:

- the page loads at the folder URL;
- styles, scripts, images, and fonts load without 404s;
- navigation and client-side routes retain the folder prefix;
- the browser console has no errors;
- the layout works at narrow and wide viewport sizes.

## Deploy through Git

Production deployment is the normal Git workflow:

```sh
git status --short
git diff --check
git add -- <folder-name>
git commit -m "Add <project name>"
git push origin main
```

For an update, use a focused commit message such as `Update code editor typing demo` and stage only the files intended for that deployment.

After pushing:

1. Confirm the commit reached `bacoords/spaces` on `main`.
2. Wait for the GitHub check named `Spacefast Builds` to finish successfully, when it is shown.
3. Verify `https://spaces.briancoords.com/<folder-name>/` directly before reporting the deployment complete.

Do not run `sf publish` for an individual subfolder and do not create a separate Space for it. Do not add or push to a credential-bearing Spacefast Git remote. This Space is GitHub-managed, so `origin/main` is the production path. Never force-push `main`.

## Troubleshooting

If a push does not appear in production:

1. Confirm the changes are committed and pushed to `origin/main`.
2. Inspect the `Spacefast Builds` check and its build log on the GitHub commit.
3. Confirm the project has `<folder-name>/index.html` and all asset URLs work beneath the folder path.
4. Check the Spacefast dashboard's Builds page for the connected repository and production branch.
5. Do not create a replacement Space or change the custom domain as a workaround.

## Spacefast documentation

- [Spacefast documentation](https://spacefast.com/docs/)
- [Publish from Git](https://spacefast.com/docs/git/)
- [Publishing and versions](https://spacefast.com/docs/publish/)
- [URLs and hostnames](https://spacefast.com/docs/urls/)
- [Plain HTML projects](https://spacefast.com/docs/recipes/html/)
- [Custom domains](https://spacefast.com/docs/domains/)
- [Agent setup](https://spacefast.com/docs/agents/)
- [CLI reference](https://spacefast.com/docs/cli/)
