project('ycaptool', ['cpp', 'c'], version: '1.0')

gtkmm = dependency('gtkmm-3.0')
glib = dependency('glib-2.0')
gio = dependency('gio-2.0')

gresource_xml = 'ycaptool.gresource.xml' 

resources_c = 'resources.c' 
glib_compile = find_program('glib-compile-resources', required : true)

gen_resources = custom_target(
  'ycaptool-resources', 
  output  : resources_c,
  input   : gresource_xml,
  command : [
    glib_compile,
    '@INPUT@', 
    '--sourcedir=' + meson.current_source_dir(),
    '--target=@OUTPUT@', 
    '--generate-source',
    '--c-name', 'ycaptool_resources'
  ]
)

executable('ycaptool',
  ['main.cpp', gen_resources], 
  dependencies : [ gtkmm, glib, gio ],
  install : false
)
