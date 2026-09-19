# Frontend Template

This Repo is intended to be used as a template frontend repo for all moleculemaker frontends.
This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.2.7. 

## Bootstrap

1. Clone repo to local machine
2. If you do not have nvm installed, install it from https://github.com/nvm-sh/nvm
3. Run `nvm use` to set the correct node version for this project
4. Authenticate against the two private registries this project installs from.
   Add both lines to `~/.npmrc`:

   ```
   //npm.pkg.github.com/:_authToken=<GitHub personal access token>
   //hub.chemaxon.com/artifactory/api/npm/npm/:_auth=<ChemAxon Artifactory credential>
   ```

   - **GitHub Packages** hosts the `@moleculemaker/dev-tool` dev dependency. Use
     a personal access token with the `read:packages` scope. The scope-to-registry
     mapping is already in this repo's checked-in `.npmrc`, so only the token
     line is needed here.
   - **ChemAxon's Artifactory** is an npm mirror, and `package-lock.json`
     resolves most of its entries (1580 of them, including ordinary packages
     such as `yaml` and `zone.js`) through it. The host rejects anonymous
     requests, so without this line `npm install` fails with `HTTP 401` on those
     packages even though no `@chemaxon`-scoped package remains in
     `package.json`. Ask the team for the credential; CI reads it from the
     `NPM_TOKEN` secret.

   Without both, `npm install` and `npm ci` fail with `401 Unauthorized`. CI does
   the equivalent before installing; see `.github/workflows/`.
5. Run `npm install` to install the dependencies
6. Run `npm run init` to generate deployment configuration for the app. You will be prompted to enter the app name.

## Utilities

This repo includes a library that helps build frontend application quickly.

- Code Generator:

  - Command: `ng g @moleculemaker/dev-tool:mmli-job`

    Effect: Generate a template job input page, loading page, and result page

  - Command: `ng g @moleculemaker/dev-tool:deployment`
 
    Effect: Generate an application with ArgoCD deployment configuation.

- UI Library

  All builtin components are inside `src/app/components` folder.

  Component Preview (WIP): use storybook

## Development server

Run `npm start` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
