#!/usr/bin/env bash
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
YCAPTOOL_DIR="$SCRIPT_DIR"
PKGS_DIR="$(dirname "$YCAPTOOL_DIR")"
PROJECT_ROOT="$(dirname "$PKGS_DIR")"

BIN_DIR="$YCAPTOOL_DIR/bin"
BUILD_DIR_GUI="$YCAPTOOL_DIR/build"

# Usage
usage() {
    cat <<EOF
Usage: $(basename "$0") [OPTION]

No args  Build the ycaptool binary.
--clean  Clean build artifacts (build/, bin/)
--help   Show this help
EOF
}

# Clean
do_clean() {
    echo -e "${YELLOW}Cleaning build directories...${NC}"
    rm -rf "$BUILD_DIR_GUI" "$BIN_DIR"
    echo -e "${GREEN}Clean complete${NC}"
}

# Build ycaptool GUI (meson)
build_ycaptool() {
    echo -e "${YELLOW}Building ycaptool (GTKMM)...${NC}"

    # check meson/ninja
    if ! command -v meson >/dev/null 2>&1; then
        echo -e "${RED}Error: meson not found. Install meson and ninja-build.${NC}"
        exit 1
    fi
    if ! command -v ninja >/dev/null 2>&1; then
        echo -e "${RED}Error: ninja not found. Install ninja-build.${NC}"
        exit 1
    fi

    # clean previous GUI build and create build dir
    if [ -d "$BUILD_DIR_GUI" ]; then
        rm -rf "$BUILD_DIR_GUI"
    fi
    mkdir -p "$BUILD_DIR_GUI"
    mkdir -p "$BIN_DIR"

    # Bundle flameshot
    echo -e "${YELLOW}Preparing flameshot for bundling...${NC}"
    FLAMESHOT_SOURCE="$PROJECT_ROOT/third-party/flameshot/bin/flameshot"
    FLAMESHOT_DEST="$BIN_DIR/flameshot"
    if [ -f "$FLAMESHOT_SOURCE" ]; then
        cp "$FLAMESHOT_SOURCE" "$FLAMESHOT_DEST"
        chmod +x "$FLAMESHOT_DEST"
        echo -e "${GREEN}✓ Copied flameshot to $FLAMESHOT_DEST for bundling${NC}"
    else
        echo -e "${YELLOW}⚠ Warning: Flameshot not found at $FLAMESHOT_SOURCE${NC}"
        echo -e "${YELLOW}  The binary will use system flameshot if available.${NC}"
        # Create a placeholder so meson doesn't fail
        touch "$FLAMESHOT_DEST"
    fi

    # Symlink hm-monitors.sh for bundling
    echo -e "${YELLOW}Linking hm-monitors.sh for bundling...${NC}"
    HM_MONITORS_SCRIPT="$PROJECT_ROOT/packages/orchestrator/src/platform/linux/hm-monitors.sh"
    if [ -f "$HM_MONITORS_SCRIPT" ]; then
        ln -sf "$HM_MONITORS_SCRIPT" "$YCAPTOOL_DIR/hm-monitors.sh"
        echo -e "${GREEN}✓ Linked hm-monitors.sh${NC}"
    else
        echo -e "${RED}Error: hm-monitors.sh not found at $HM_MONITORS_SCRIPT${NC}"
        exit 1
    fi

    meson setup "$BUILD_DIR_GUI" "$YCAPTOOL_DIR" --buildtype=release

    echo -e "${YELLOW}Compiling ycaptool (meson/ninja)...${NC}"
    meson compile -C "$BUILD_DIR_GUI" -v

    # Remove symlink
    rm "$YCAPTOOL_DIR/hm-monitors.sh"
    echo -e "${YELLOW}Cleaned up hm-monitors.sh link${NC}"
    echo -e "${GREEN}✓ ycaptool meson build complete${NC}"

    if [ ! -f "$BUILD_DIR_GUI/ycaptool" ]; then
        echo -e "${RED}Error: Build failed - no binary found at $BUILD_DIR_GUI/ycaptool${NC}"
        exit 1
    fi

    cp "$BUILD_DIR_GUI/ycaptool" "$BIN_DIR/ycaptool"
    chmod +x "$BIN_DIR/ycaptool"

    echo -e "${GREEN}✓ ycaptool built and installed to $BIN_DIR/ycaptool${NC}"
    echo -e "${GREEN}✓ Embedded flameshot located at resource bin/flameshot inside the executable${NC}"
}

# Parse args
if [ $# -eq 0 ]; then
    ACTION="build"
else
    case "$1" in
        --clean) ACTION="clean" ;; 
        --help|-h) usage; exit 0 ;; 
        *)
            echo -e "${RED}Invalid argument: $1${NC}"
            usage
            exit 1
            ;;
    esac
fi

# Execute selected action
case "$ACTION" in
    build)
        build_ycaptool
        ;;
    clean)
        do_clean
        ;;
esac

exit 0