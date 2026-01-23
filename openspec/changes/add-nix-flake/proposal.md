# Change: Add Nix Flake for Declarative Installation

## Why

Nix users currently need to install OpenSpecUI through npm/pnpm, which requires managing Node.js versions manually and doesn't integrate with their declarative system configuration. This creates friction for teams and individuals using NixOS or Nix package manager who want to:

- Install OpenSpecUI declaratively in their system/user profiles
- Run OpenSpecUI without global npm installation
- Ensure reproducible builds with pinned dependencies
- Integrate OpenSpecUI into NixOS configurations or development shells
- Avoid polluting their system with npm global packages

Adding a Nix Flake provides a modern, declarative way for Nix users to install and run OpenSpecUI while maintaining compatibility with existing npm-based installations.

## What Changes

- Add `flake.nix` at repository root with outputs for packages, apps, and devShells
- Package OpenSpecUI as a Nix derivation using `buildNpmPackage` or pnpm-specific tooling
- Reference implementation: https://github.com/Fission-AI/OpenSpec/blob/main/flake.nix (demonstrates proper pnpm derivation setup with `fetchPnpmDeps`, `pnpmConfigHook`, and `npmInstallHook`)
- Support both `nix run` (ephemeral) and `nix profile install` (persistent) installation methods
- Provide a development shell (`nix develop`) with all required dependencies
- Pin Node.js version (20.x) and pnpm version (10.22.0) to match project requirements
- Handle native dependency `@parcel/watcher` compilation during Nix build
- Add documentation for Nix users in README.md (English + Chinese sections)
- Update .gitignore to exclude Nix build artifacts

### Nix Flake Structure

The flake will provide:

1. **Packages** (`nix build`)
   - `packages.x86_64-linux.default` - OpenSpecUI CLI tool
   - `packages.aarch64-linux.default` - ARM Linux build
   - `packages.x86_64-darwin.default` - macOS Intel build
   - `packages.aarch64-darwin.default` - macOS ARM build

2. **Apps** (`nix run`)
   - `apps.{system}.default` - Run openspecui command directly
   - `apps.{system}.openspecui` - Named app for clarity

3. **Development Shell** (`nix develop`)
   - Node.js 20.x
   - pnpm 10.22.0
   - Build tools (python3, pkg-config for native modules)
   - All dependencies for development

### Implementation Reference

The OpenSpec project provides a good reference implementation for pnpm-based Nix derivations:
https://github.com/Fission-AI/OpenSpec/blob/main/flake.nix

Key patterns to follow from this example:

- Use `pkgs.fetchPnpmDeps` to fetch and cache pnpm dependencies with a content hash
- Use `pnpmConfigHook` and `npmHooks.npmInstallHook` for proper pnpm setup
- Set `fetcherVersion = 3` for the pnpm fetcher
- Use `dontNpmPrune = true` to preserve all dependencies needed for the build
- Structure with `stdenv.mkDerivation` passing `finalAttrs` for self-referencing in `pnpmDeps`
- Define explicit `buildPhase` calling `pnpm run build` with hooks

### User Workflows

**Run without installation:**

```bash
nix run github:jixoai-labs/openspecui
nix run github:jixoai-labs/openspecui -- --help
nix run github:jixoai-labs/openspecui -- export ./dist
```

**Install to user profile:**

```bash
nix profile install github:jixoai-labs/openspecui
openspecui  # Available in PATH
```

**Add to NixOS configuration:**

```nix
{
  inputs.openspecui.url = "github:jixoai-labs/openspecui";

  environment.systemPackages = [
    inputs.openspecui.packages.${system}.default
  ];
}
```

**Development shell:**

```bash
nix develop  # Drops into shell with all dependencies
pnpm install
pnpm dev
```

## Impact

**Affected specs:**

No existing specs are affected. This change adds a new distribution method without modifying core functionality.

**New capability to document:**

- `nix-packaging` - Requirements for Nix Flake structure, build process, and user workflows

**Affected code:**

- `flake.nix` - New file at repository root
- `.gitignore` - Add Nix build artifacts (result, result-\*)
- `README.md` - Add Nix installation instructions (English + Chinese)
- No changes to existing source code or build process

**Breaking changes:** None - Nix support is purely additive and doesn't affect npm/pnpm workflows

**Dependencies:**

- Requires Nix package manager (>= 2.4 with flakes enabled)
- Uses nixpkgs for Node.js, pnpm, and build tools
- Native dependency `@parcel/watcher` must compile in Nix sandbox

**Compatibility:**

- Works alongside existing npm/pnpm installation methods
- Nix builds are hermetic and don't interfere with development workflows
- Lock files (pnpm-lock.yaml) remain the source of truth for dependencies
