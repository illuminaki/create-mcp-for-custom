# Limpiar base de datos
puts "Limpiando base de datos..."
User.destroy_all
Book.destroy_all

# Crear Usuarios
puts "Creando 110 usuarios..."
110.times do |i|
  User.create!(
    name: "Usuario #{i + 1}",
    score: rand(0..100).to_s
  )
end

# Crear Libros
puts "Creando 110 libros..."
110.times do |i|
  Book.create!(
    title: "Libro de IA Vol. #{i + 1}",
    desc: "Una guía completa sobre el capítulo #{i + 1} de la revolución de los agentes y MCP."
  )
end

puts "¡Listo! Se crearon #{User.count} usuarios y #{Book.count} libros."
