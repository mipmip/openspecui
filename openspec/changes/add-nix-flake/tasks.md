# Implementation Tasks

## 1. Nix Flake Infrastructure

- [x] 1.1 Create `flake.nix` with flake schema (description, inputs, outputs)
- [x] 1.2 Define nixpkgs input and flake-utils for multi-system support
- [x] 1.3 Configure package derivation using `buildNpmPackage`
- [x] 1.4 Set up pnpm dependencies and workspace configuration
- [x] 1.5 Handle native module compilation (@parcel/watcher) in Nix sandbox

## 2. Package Definition

- [x] 2.1 Extract package metadata from packages/cli/package.json (name, version)
- [x] 2.2 Configure build phase to run pnpm build
- [x] 2.3 Set up install phase to copy built CLI to $out/bin
- [x] 2.4 Configure npmDepsHash for pnpm dependency fetching
- [x] 2.5 Add required build inputs (nodejs_20, pnpm, python3, pkg-config)

## 3. Multi-Platform Support

- [x] 3.1 Use flake-utils.lib.eachDefaultSystem for cross-platform builds
- [x] 3.2 Test on x86_64-linux (most common)
- [ ] 3.3 Test on aarch64-linux (ARM servers, Raspberry Pi)
- [ ] 3.4 Test on x86_64-darwin (Intel Macs)
- [ ] 3.5 Test on aarch64-darwin (Apple Silicon Macs)

## 4. App and Development Shell

- [x] 4.1 Define apps.default output to run openspecui command
- [x] 4.2 Create devShells.default with Node.js 20, pnpm 10.22.0
- [x] 4.3 Include build tools in devShell for native module compilation
- [x] 4.4 Test `nix develop` drops into working development environment
- [x] 4.5 Verify pnpm install and pnpm dev work in nix develop shell

## 5. Testing and Validation

- [x] 5.1 Test `nix build` produces working openspecui executable
- [x] 5.2 Test `nix run` executes openspecui without installation
- [x] 5.3 Test `nix run . -- --help` shows CLI help
- [ ] 5.4 Test `nix run . -- export ./test` creates static export
- [ ] 5.5 Test `nix profile install` and verify command in PATH
- [x] 5.6 Test native module (@parcel/watcher) works in Nix-built package
- [x] 5.7 Test on at least two platforms (Linux + macOS or Linux + NixOS)

## 6. Documentation

- [x] 6.1 Add Nix installation section to README.md (English)
- [x] 6.2 Add Nix installation section to README.md (Chinese)
- [x] 6.3 Document `nix run` for ephemeral usage
- [x] 6.4 Document `nix profile install` for persistent installation
- [x] 6.5 Document NixOS configuration example
- [x] 6.6 Document development shell usage with `nix develop`
- [x] 6.7 Add flake.nix usage examples in comments

## 7. Repository Configuration

- [x] 7.1 Add `result` and `result-*` to .gitignore (Nix build symlinks)
- [x] 7.2 Verify flake.nix passes `nix flake check`
- [x] 7.3 Add flake metadata (description, outputs documentation)
- [ ] 7.4 Consider adding GitHub Actions workflow to test Nix builds (optional)

## Notes

- **Native dependencies**: @parcel/watcher requires C++ compilation, ensure build tools are available in Nix derivation ✓
- **pnpm workspace**: The monorepo structure requires special handling in buildNpmPackage to respect workspace protocol ✓
- **Lock file**: npmDepsHash must be computed with `nix-prefetch` or by attempting build and using suggested hash ✓
- **Flakes**: Users need `experimental-features = nix-command flakes` in their Nix configuration
