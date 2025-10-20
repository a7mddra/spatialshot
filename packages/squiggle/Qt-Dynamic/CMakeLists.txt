cmake_minimum_required(VERSION 3.16)
project(spatialshot-squiggle VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Qt6 REQUIRED COMPONENTS Core Gui Widgets OpenGL OpenGLWidgets)
qt_standard_project_setup()

add_executable(spatialshot-squiggle
    ../src/main.cpp
    ../src/MainWindow.cpp
)

target_link_libraries(spatialshot-squiggle PRIVATE
    Qt6::Core
    Qt6::Gui
    Qt6::Widgets
    Qt6::OpenGL
    Qt6::OpenGLWidgets
)

install(TARGETS spatialshot-squiggle
    RUNTIME DESTINATION bin
)
