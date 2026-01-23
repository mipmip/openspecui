# Design: Nix Flake Integration

## Overview

This design adds Nix Flake support to OpenSpecUI, enabling declarative installation and reproducible builds for Nix users. The implementation uses `buildNpmPackage` to package the existing npm-based project without requiring changes to the core build system.

## Architecture

### Flake Structure

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system: {
      packages.default = <openspecui-derivation>;
      apps.default = { type = "app"; program = "${packages.default}/bin/openspecui"; };
      devShells.default = <development-environment>;
    });
}
```

### Build Strategy

**Use buildNpmPackage from nixpkgs:**

- Leverages Nix's existing npm packaging infrastructure
- Handles pnpm workspaces automatically
- Fetches and caches npm dependencies based on lock file
- Compiles native modules (@parcel/watcher) in Nix sandbox

**Build phases:**

1. **Fetch dependencies** - Nix downloads and caches all pnpm dependencies
2. **Configure** - Set up pnpm workspace with correct Node.js version
3. **Build** - Run `pnpm build` to compile TypeScript and bundle packages
4. **Install** - Copy `packages/cli/dist/cli.mjs` to `$out/bin/openspecui`

### Native Module Handling

`@parcel/watcher` is a native Node.js addon that requires C++ compilation:

**Build inputs required:**

- `python3` - For node-gyp build scripts
- `pkg-config` - For finding system libraries
- `gcc`/`clang` - C++ compiler (provided by stdenv)

**Strategy:**

```nix
buildInputs = [ pkg-config python3 ];
nativeBuildInputs = [ nodejs_20 pnpm ];
```

The Nix sandbox will compile the native module during the build phase.

### Dependency Hash Management

Nix requires a hash of all npm dependencies for reproducibility:

```nix
npmDepsHash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
```

**Process:**

1. Initial build with fake hash (lib.fakeHash) to trigger build
2. Nix will fail and suggest the correct hash
3. Update flake.nix with the real hash
4. Subsequent builds use cached dependencies

**Updates:**
When package-lock.json or pnpm-lock.yaml changes, the hash must be updated.

### Multi-System Support

Using `flake-utils.lib.eachDefaultSystem` provides builds for:

- `x86_64-linux` - Standard Linux
- `aarch64-linux` - ARM Linux (Raspberry Pi, ARM servers)
- `x86_64-darwin` - Intel macOS
- `aarch64-darwin` - Apple Silicon macOS

Each system gets its own package output and build cache.

### Development Shell

The dev shell provides all tools needed for development:

```nix
devShells.default = pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs_20
    pkgs.pnpm
    pkgs.python3
    pkgs.pkg-config
  ];

  shellHook = ''
    echo "OpenSpecUI development environment"
    echo "Run: pnpm install && pnpm dev"
  '';
};
```

This ensures developers have the exact Node.js and pnpm versions required.

## Integration Points

### With Existing Build System

**No changes required:**

- Nix calls the existing `pnpm build` command
- Uses existing package.json scripts and tsconfig
- Respects pnpm-lock.yaml for dependency versions

**Nix build is a wrapper:**

```
Nix → pnpm build → TypeScript → Bundled packages → openspecui CLI
```

### With npm Distribution

**Parallel distribution channels:**

- npm/pnpm users continue using `npm install -g openspecui`
- Nix users use `nix profile install` or `nix run`
- Both methods install the same functional binary
- No version skew - Nix uses the same source and build process

### With Version Management

**Version source of truth:**

- `packages/cli/package.json` contains version number
- Nix derivation reads version from package.json
- Both npm and Nix packages have same version

**Release process:**

1. Update version in package.json
2. Build and publish to npm
3. Push to GitHub (triggers Nix flake update)
4. Nix users get new version via flake inputs

## User Experience

### Discovery and Installation

**GitHub README:**

```markdown
### Installation

#### Via npm (all platforms)

npm install -g openspecui

#### Via Nix (Linux, macOS)

nix profile install github:jixoai-labs/openspecui

#### Via NixOS configuration

# Add to configuration.nix

environment.systemPackages = [
inputs.openspecui.packages.${pkgs.system}.default
];
```

### Running Without Installation

```bash
# Run directly from GitHub
nix run github:jixoai-labs/openspecui

# With arguments
nix run github:jixoai-labs/openspecui -- export ./docs
nix run github:jixoai-labs/openspecui -- --help
```

### Development Workflow

```bash
# Enter development shell
nix develop

# Now have correct Node.js + pnpm versions
pnpm install
pnpm dev

# Exit shell
exit
```

## Alternatives Considered

### 1. Use buildNodePackage instead of buildNpmPackage

**Rejected:** buildNpmPackage is newer and better handles pnpm workspaces.

### 2. Package each workspace separately

**Rejected:** Too complex. The CLI package depends on others, so packaging as a single derivation is simpler.

### 3. Use npm2nix or node2nix

**Rejected:** These tools generate complex lock files. buildNpmPackage directly uses pnpm-lock.yaml.

### 4. Pre-build in CI and package binaries

**Rejected:** Goes against Nix philosophy of building from source. Also requires per-platform binaries.

## Testing Strategy

**Build testing:**

```bash
nix build                    # Test build succeeds
./result/bin/openspecui --help  # Test binary works
```

**Runtime testing:**

```bash
nix run . -- --version
nix run . -- export ./test-export --clean
```

**Cross-platform testing:**

- Test on NixOS (primary use case)
- Test on Linux with Nix package manager
- Test on macOS (if available)
- Use GitHub Actions with Nix for CI (optional)

**Native module verification:**

```bash
# After build, verify watcher works
nix run . -- ./test-project  # Should watch files
```

## Rollout Plan

1. **Add flake.nix** - Implement basic derivation
2. **Test locally** - Verify builds on Linux
3. **Add documentation** - Update README with Nix instructions
4. **Submit PR** - Request review from maintainers and Nix users
5. **Iterate** - Fix issues found during testing
6. **Merge** - After validation on multiple platforms

## Maintenance

**When dependencies change:**

1. Update pnpm-lock.yaml (existing process)
2. Rebuild with Nix - build will fail with hash mismatch
3. Update npmDepsHash in flake.nix with suggested value
4. Commit both files together

**When Node.js version changes:**

1. Update `engines.node` in package.json
2. Update `nodejs_20` in flake.nix to match (e.g., nodejs_22)
3. Test build and update if needed

## Security Considerations

**Dependency pinning:**

- Nix fetches dependencies based on pnpm-lock.yaml
- Hash verification ensures no tampering
- Reproducible builds from same source always produce same output

**Sandbox isolation:**

- Nix builds in isolated sandbox (no network, limited filesystem)
- Native module compilation happens in controlled environment
- Output is deterministic and cacheable

**Supply chain:**

- GitHub is source of truth for flake
- Users can pin specific commits: `github:jixoai-labs/openspecui?rev=abc123`
- Nix users can audit source before building
