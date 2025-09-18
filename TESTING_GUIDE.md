# 🧪 Guía de Pruebas - Sistema de Grabación y Análisis de Clases

## ✅ Estado del Sistema

**Backend:** ✅ Funcionando en http://localhost:3001  
**Frontend:** ✅ Funcionando en http://localhost:8080  
**Base de Datos:** ✅ SQLite configurada con datos de prueba

## 🔑 Cuentas de Prueba

### Administrador
- **Email:** admin@ontrack.com
- **Contraseña:** admin123
- **Rol:** ADMIN

### Profesor
- **Email:** profesor@ontrack.com
- **Contraseña:** teacher123
- **Rol:** TEACHER

## 📚 Clases de Prueba

1. **Matemáticas Básicas**
   - Aula: 101
   - Horario: Lunes y Miércoles 9:00-10:30
   - Estudiantes: María García, Carlos López
   - Estado: SCHEDULED

2. **Historia Universal**
   - Aula: 205
   - Horario: Martes y Jueves 14:00-15:30
   - Estudiantes: Carlos López, Ana Martínez
   - Estado: SCHEDULED

## 🎯 Flujo de Pruebas

### 1. Acceder al Sistema
1. Abrir http://localhost:8080 en el navegador
2. Iniciar sesión con `profesor@ontrack.com` / `teacher123`
3. Verificar que aparezcan las clases de prueba

### 2. Probar Grabación en Tiempo Real
1. En la página de Clases, hacer clic en "Grabar" en "Matemáticas Básicas"
2. En el modal de grabación:
   - Ingresar título: "Clase de Prueba - Números Enteros"
   - Ingresar descripción: "Explicación de números enteros"
   - Hacer clic en "Iniciar Grabación"
   - Hablar por unos segundos (simular clase)
   - Hacer clic en "Detener Grabación"
3. Verificar que se cree la grabación y se inicie el análisis

### 3. Probar Subida de Archivo de Audio
1. En el modal de grabación, hacer clic en "Subir Archivo"
2. Seleccionar un archivo de audio (MP3, WAV, etc.)
3. Verificar que se procese la transcripción automáticamente

### 4. Ver Análisis de Clases
1. En la página de Clases, hacer clic en "Análisis" en "Matemáticas Básicas"
2. Verificar que aparezca el análisis de la clase de prueba con:
   - Resumen de la clase
   - Conceptos clave identificados
   - Métricas de participación estudiantil
   - Momentos importantes
   - Sugerencias de mejora
   - Evaluación general

### 5. Probar Creación de Nueva Clase
1. Hacer clic en "Crear Clase" (si está disponible)
2. Llenar los campos:
   - Nombre: "Ciencias Naturales"
   - Materia: "Ciencias"
   - Ubicación: "Aula 301"
   - Horario: "Viernes 10:00-11:30"
   - Descripción: "Estudio de la naturaleza"
3. Guardar y verificar que aparezca en la lista

## 🔧 Funcionalidades a Probar

### ✅ Grabación de Audio
- [ ] Grabación en tiempo real desde el navegador
- [ ] Subida de archivos de audio
- [ ] Indicadores de progreso
- [ ] Estados de grabación (IN_PROGRESS, COMPLETED, FAILED)

### ✅ Transcripción Automática
- [ ] Procesamiento automático de audio
- [ ] Identificación de hablantes (Profesor/Estudiante)
- [ ] Limpieza y formateo de transcripción

### ✅ Análisis con IA
- [ ] Análisis automático de transcripciones
- [ ] Métricas de participación estudiantil
- [ ] Identificación de conceptos clave
- [ ] Sugerencias de mejora
- [ ] Evaluación general

### ✅ Interfaz de Usuario
- [ ] Modal de grabación con controles
- [ ] Modal de análisis con métricas visuales
- [ ] Estados de procesamiento en tiempo real
- [ ] Navegación entre secciones

## 🐛 Problemas Conocidos

1. **Transcripción con OpenAI:** Requiere clave de API válida
2. **Análisis con Straico:** Requiere clave de API válida
3. **Archivos de audio:** Se almacenan localmente en `uploads/recordings/`

## 📊 Datos de Prueba Incluidos

- 1 Escuela: "Escuela de Prueba OnTrack"
- 1 Administrador: admin@ontrack.com
- 1 Profesor: profesor@ontrack.com
- 3 Estudiantes: María García, Carlos López, Ana Martínez
- 2 Clases: Matemáticas Básicas, Historia Universal
- 1 Grabación de muestra con análisis completo

## 🚀 Próximos Pasos

1. **Configurar APIs Externas:**
   - Obtener clave de OpenAI para transcripción
   - Obtener clave de Straico para análisis

2. **Probar Funcionalidades Completas:**
   - Grabación real con transcripción
   - Análisis automático con IA

3. **Desplegar en Servidor:**
   - Configurar PostgreSQL en Ubuntu
   - Desplegar backend y frontend
   - Configurar variables de entorno

## 📝 Notas Técnicas

- **Base de Datos:** SQLite local para pruebas
- **Autenticación:** JWT tokens
- **Archivos:** Almacenamiento local
- **APIs:** OpenAI Whisper + Straico Claude
- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Express + TypeScript + Prisma

¡El sistema está listo para probar! 🎉
