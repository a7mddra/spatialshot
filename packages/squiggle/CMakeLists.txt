cmake_minimum_required(VERSION 3.16)
project(spatialshot-squiggle VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# This option will be enabled by our build.py script
option(BUILD_STATIC "Build a standalone static executable" ON)

# Find the Qt6 package. For static builds, CMAKE_PREFIX_PATH must be
# set to the location of a static Qt build.
find_package(Qt6 REQUIRED COMPONENTS Core Gui Widgets)

# --- Main Executable Target ---
add_executable(${PROJECT_NAME}
    src/main.cpp
    src/MainWindow.cpp
)

# Set common properties for the executable
set_target_properties(${PROJECT_NAME} PROPERTIES
    WIN32_EXECUTABLE ${WIN32}
    MACOSX_BUNDLE OFF # We want a single Mach-O file, not a .app bundle
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/dist"
)

# --- Linking Logic ---
target_link_libraries(${PROJECT_NAME} PRIVATE
    Qt6::Core
    Qt6::Gui
    Qt6::Widgets
)

if(BUILD_STATIC)
    message(STATUS "Static build enabled. Linking Qt statically.")
    # On Windows with MSVC, this helps select the static C runtime library (/MT)
    if(MSVC)
        set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
    endif()

    # Add flags to encourage full static linking
    if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
        set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -static")
    endif()
else()
    message(STATUS "Dynamic build enabled.")
endif()

# Installation logic for the final binary
install(TARGETS ${PROJECT_NAME}
    RUNTIME DESTINATION bin
)
