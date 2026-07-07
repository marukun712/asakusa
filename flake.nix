{
  description = "Shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
        deno = pkgs.stdenv.mkDerivation {
          name = "deno-2.9.0";
          src = pkgs.fetchurl {
            url = "https://github.com/denoland/deno/releases/download/v2.9.0/deno-x86_64-unknown-linux-gnu.zip";
            sha256 = "16445hdfssarvm4ziagjpi0bsqg884fhgn18ph1pd9ayq0zwgjcn";
          };
          nativeBuildInputs = [ pkgs.unzip ];
          unpackPhase = "unzip $src";
          installPhase = ''
            mkdir -p $out/bin
            cp deno $out/bin/
            chmod +x $out/bin/deno
          '';
        };
      in
      {
        devShell = pkgs.mkShell {
          buildInputs = [
            deno
            pkgs.webkitgtk_4_1
            pkgs.gtk3
            pkgs.glib
            pkgs.libsoup_3
            pkgs.stdenv.cc.cc
          ];
          shellHook = ''
            export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath [
              pkgs.webkitgtk_4_1
              pkgs.gtk3
              pkgs.glib
              pkgs.libsoup_3
              pkgs.stdenv.cc.cc
            ]}:$LD_LIBRARY_PATH
          '';
        };
      }
    );
}
