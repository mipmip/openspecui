{
  description = "OpenSpecUI - Visual interface for spec-driven development";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];

      forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f system);
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.stdenv.mkDerivation (finalAttrs: {
            pname = "openspecui";
            version = "0.1.0";

            src = ./.;

            pnpmDeps = pkgs.fetchPnpmDeps {
              inherit (finalAttrs) pname version src;
              pnpm = pkgs.pnpm_9;
              fetcherVersion = 3;
              hash = "sha256-Wkyi2iusnbx/yWkRneJT6oNcbJno0WlgoFnSQE6310k=";
            };

            nativeBuildInputs = with pkgs; [
              nodejs_20
              npmHooks.npmInstallHook
              pnpmConfigHook
              pnpm_9
              python3
              pkg-config
            ];

            buildPhase = ''
              runHook preBuild

              pnpm run build

              runHook postBuild
            '';

            installPhase = ''
              runHook preInstall

              # Copy the entire build output
              mkdir -p $out/lib/node_modules
              cp -r node_modules $out/lib/
              cp -r packages $out/lib/
              cp package.json $out/lib/
              cp pnpm-workspace.yaml $out/lib/

              # Create the binary wrapper
              mkdir -p $out/bin
              cat > $out/bin/openspecui <<'EOF'
#!/usr/bin/env bash
DIR="$( cd "$( dirname "''${BASH_SOURCE[0]}" )" && pwd )"
exec node "$DIR/../lib/packages/cli/dist/cli.mjs" "$@"
EOF
              chmod +x $out/bin/openspecui

              runHook postInstall
            '';

            dontNpmBuild = true;
            dontNpmPrune = true;

            meta = with pkgs.lib; {
              description = "Visual interface for spec-driven development";
              homepage = "https://github.com/jixoai-labs/openspecui";
              license = licenses.mit;
              maintainers = [ ];
              mainProgram = "openspecui";
            };
          });
        });

      apps = forAllSystems (system: {
        default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/openspecui";
        };
        openspecui = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/openspecui";
        };
      });

      devShells = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            buildInputs = with pkgs; [
              nodejs_20
              pnpm_9
              python3
              pkg-config
            ];

            shellHook = ''
              echo "OpenSpecUI development environment"
              echo "Node version: $(node --version)"
              echo "pnpm version: $(pnpm --version)"
              echo ""
              echo "Run 'pnpm install' to install dependencies"
              echo "Run 'pnpm dev' to start development server"
            '';
          };
        });
    };
}
