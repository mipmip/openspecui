# Nix Packaging

## ADDED Requirements

### Requirement: Nix Flake Structure

The project SHALL provide a Nix flake (`flake.nix`) at the repository root that defines packages, apps, and development shells for all supported systems (x86_64-linux, aarch64-linux, x86_64-darwin, aarch64-darwin).

#### Scenario: Build package with Nix

- **WHEN** a user runs `nix build` in the repository root
- **THEN** the OpenSpecUI CLI tool is built as a Nix derivation
- **AND** the result is available in the `result` symlink

#### Scenario: Run without installation

- **WHEN** a user runs `nix run github:jixoai-labs/openspecui -- --help`
- **THEN** the OpenSpecUI CLI executes without requiring installation
- **AND** the help message is displayed

### Requirement: pnpm Dependency Management

The Nix derivation SHALL use pnpm-specific tooling to fetch and install dependencies reproducibly.

#### Scenario: Fetch pnpm dependencies

- **WHEN** building the Nix package
- **THEN** dependencies are fetched using `fetchPnpmDeps` with a content hash
- **AND** the pnpm lock file is used as the source of truth

#### Scenario: Install dependencies with pnpm hooks

- **WHEN** the Nix build runs the install phase
- **THEN** it uses `pnpmConfigHook` and `npmInstallHook` for proper pnpm setup
- **AND** all dependencies required for the build are preserved (dontNpmPrune = true)

### Requirement: Build Process

The Nix derivation SHALL execute the standard pnpm build process and package the result.

#### Scenario: Execute pnpm build

- **WHEN** the Nix build runs the build phase
- **THEN** it executes `pnpm run build` with pre/post hooks
- **AND** the built artifacts are installed to the Nix store output

#### Scenario: Native dependencies compilation

- **WHEN** building on a system with native dependencies (e.g., @parcel/watcher)
- **THEN** the Nix sandbox compiles them with the necessary build tools
- **AND** the build succeeds without network access

### Requirement: Installation Methods

The package SHALL support multiple installation methods for different user workflows.

#### Scenario: Install to user profile

- **WHEN** a user runs `nix profile install github:jixoai-labs/openspecui`
- **THEN** OpenSpecUI is installed persistently to their user profile
- **AND** the `openspecui` command is available in their PATH

#### Scenario: Add to NixOS system configuration

- **WHEN** a user adds the flake input to their NixOS configuration
- **THEN** they can reference `inputs.openspecui.packages.${system}.default`
- **AND** OpenSpecUI is available system-wide after rebuilding

#### Scenario: Use in home-manager

- **WHEN** a user adds the package to their home-manager configuration
- **THEN** OpenSpecUI is installed declaratively to their home environment

### Requirement: Development Shell

The flake SHALL provide a development shell with all necessary dependencies for contributing to the project.

#### Scenario: Enter development shell

- **WHEN** a developer runs `nix develop` in the repository
- **THEN** a shell is provided with Node.js 20.x and pnpm 10.22.0
- **AND** build tools for native dependencies are available
- **AND** a welcome message shows the environment details

#### Scenario: Install dependencies in dev shell

- **WHEN** a developer runs `pnpm install` in the dev shell
- **THEN** all dependencies are installed successfully
- **AND** the developer can run `pnpm dev` to start the development server

### Requirement: Multi-Platform Support

The flake SHALL build successfully on all supported platforms without platform-specific workarounds.

#### Scenario: Build on Linux x86_64

- **WHEN** building on x86_64-linux
- **THEN** the package builds and runs successfully

#### Scenario: Build on Linux ARM64

- **WHEN** building on aarch64-linux
- **THEN** the package builds and runs successfully

#### Scenario: Build on macOS Intel

- **WHEN** building on x86_64-darwin
- **THEN** the package builds and runs successfully

#### Scenario: Build on macOS ARM (Apple Silicon)

- **WHEN** building on aarch64-darwin
- **THEN** the package builds and runs successfully

### Requirement: Version Pinning

The flake SHALL pin specific versions of Node.js and pnpm to match project requirements.

#### Scenario: Node.js version requirement

- **WHEN** the Nix derivation is built or the dev shell is entered
- **THEN** Node.js version 20.x is provided
- **AND** this matches the version specified in package.json

#### Scenario: pnpm version requirement

- **WHEN** the Nix derivation is built or the dev shell is entered
- **THEN** pnpm version 10.22.0 is provided
- **AND** this matches the version used by the project

### Requirement: Build Artifact Exclusion

The repository SHALL exclude Nix build artifacts from version control.

#### Scenario: Ignore Nix result symlinks

- **WHEN** a user runs `nix build` creating a `result` symlink
- **THEN** the symlink is ignored by git
- **AND** `.gitignore` includes patterns for `result` and `result-*`

### Requirement: Documentation

The project documentation SHALL include instructions for Nix users in both English and Chinese.

#### Scenario: Nix installation instructions in README

- **WHEN** a Nix user reads the README.md
- **THEN** they find clear instructions for running, installing, and developing with Nix
- **AND** instructions are provided in both English and Chinese sections

#### Scenario: Example commands for common workflows

- **WHEN** reviewing the Nix documentation
- **THEN** example commands are provided for:
  - Running without installation (`nix run`)
  - Installing to user profile (`nix profile install`)
  - Adding to NixOS configuration
  - Entering development shell (`nix develop`)

### Requirement: Compatibility with Existing Workflows

The Nix flake SHALL not interfere with existing npm/pnpm-based workflows.

#### Scenario: npm/pnpm still works

- **WHEN** a user has the flake.nix in their repository
- **THEN** they can still use `pnpm install` and `pnpm dev` normally
- **AND** Nix builds do not modify the working directory

#### Scenario: Lock file remains source of truth

- **WHEN** dependencies are managed
- **THEN** pnpm-lock.yaml remains the authoritative source
- **AND** Nix builds respect the lock file content
