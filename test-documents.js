const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Configuración
const BASE_URL = 'http://localhost:3001/api';
const TEST_TOKEN = 'tu_token_aqui'; // Reemplaza con un token válido

// Crear un archivo de prueba
const testContent = 'Este es un documento de prueba para el centro de conocimiento.';
fs.writeFileSync('test-document.txt', testContent);

async function testDocumentAPI() {
  console.log('🧪 Iniciando pruebas del Centro de Conocimiento...\n');

  try {
    // 1. Subir documento
    console.log('1️⃣ Subiendo documento de prueba...');
    const form = new FormData();
    form.append('file', fs.createReadStream('test-document.txt'));
    form.append('title', 'Documento de Prueba');
    form.append('description', 'Este es un documento de prueba para verificar el funcionamiento del sistema');
    form.append('category', 'pruebas');
    form.append('tags', 'test,documento,prueba');

    const uploadResponse = await fetch(`${BASE_URL}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        ...form.getHeaders()
      },
      body: form
    });

    if (!uploadResponse.ok) {
      throw new Error(`Error al subir documento: ${uploadResponse.statusText}`);
    }

    const uploadData = await uploadResponse.json();
    console.log('✅ Documento subido exitosamente');
    console.log('   ID:', uploadData.data.id);
    console.log('   Título:', uploadData.data.title);
    console.log('   S3 Key:', uploadData.data.s3Key);
    console.log('');

    const documentId = uploadData.data.id;

    // 2. Obtener todos los documentos
    console.log('2️⃣ Obteniendo todos los documentos...');
    const getAllResponse = await fetch(`${BASE_URL}/documents`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    if (!getAllResponse.ok) {
      throw new Error(`Error al obtener documentos: ${getAllResponse.statusText}`);
    }

    const getAllData = await getAllResponse.json();
    console.log('✅ Documentos obtenidos exitosamente');
    console.log('   Total documentos:', getAllData.data.length);
    console.log('');

    // 3. Obtener documento específico
    console.log('3️⃣ Obteniendo documento específico...');
    const getOneResponse = await fetch(`${BASE_URL}/documents/${documentId}`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    if (!getOneResponse.ok) {
      throw new Error(`Error al obtener documento: ${getOneResponse.statusText}`);
    }

    const getOneData = await getOneResponse.json();
    console.log('✅ Documento específico obtenido exitosamente');
    console.log('   Título:', getOneData.data.title);
    console.log('   Estado:', getOneData.data.status);
    console.log('');

    // 4. Obtener estadísticas
    console.log('4️⃣ Obteniendo estadísticas...');
    const statsResponse = await fetch(`${BASE_URL}/documents/stats`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    if (!statsResponse.ok) {
      throw new Error(`Error al obtener estadísticas: ${statsResponse.statusText}`);
    }

    const statsData = await statsResponse.json();
    console.log('✅ Estadísticas obtenidas exitosamente');
    console.log('   Total documentos:', statsData.data.totalDocuments);
    console.log('   Tamaño total:', statsData.data.totalSize, 'bytes');
    console.log('');

    // 5. Buscar por categoría
    console.log('5️⃣ Buscando documentos por categoría...');
    const categoryResponse = await fetch(`${BASE_URL}/documents/category/pruebas`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    if (!categoryResponse.ok) {
      throw new Error(`Error al buscar por categoría: ${categoryResponse.statusText}`);
    }

    const categoryData = await categoryResponse.json();
    console.log('✅ Búsqueda por categoría exitosa');
    console.log('   Documentos en categoría "pruebas":', categoryData.data.length);
    console.log('');

    // 6. Buscar por tags
    console.log('6️⃣ Buscando documentos por tags...');
    const tagsResponse = await fetch(`${BASE_URL}/documents/search/tags?tags=test`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    if (!tagsResponse.ok) {
      throw new Error(`Error al buscar por tags: ${tagsResponse.statusText}`);
    }

    const tagsData = await tagsResponse.json();
    console.log('✅ Búsqueda por tags exitosa');
    console.log('   Documentos con tag "test":', tagsData.data.length);
    console.log('');

    // 7. Actualizar metadatos
    console.log('7️⃣ Actualizando metadatos del documento...');
    const updateResponse = await fetch(`${BASE_URL}/documents/${documentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Documento de Prueba Actualizado',
        description: 'Descripción actualizada',
        tags: 'test,documento,actualizado'
      })
    });

    if (!updateResponse.ok) {
      throw new Error(`Error al actualizar documento: ${updateResponse.statusText}`);
    }

    const updateData = await updateResponse.json();
    console.log('✅ Metadatos actualizados exitosamente');
    console.log('   Nuevo título:', updateData.data.title);
    console.log('');

    // 8. Generar URL de descarga
    console.log('8️⃣ Generando URL de descarga...');
    const downloadResponse = await fetch(`${BASE_URL}/documents/${documentId}/download`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    if (!downloadResponse.ok) {
      throw new Error(`Error al generar URL de descarga: ${downloadResponse.statusText}`);
    }

    const downloadData = await downloadResponse.json();
    console.log('✅ URL de descarga generada exitosamente');
    console.log('   URL:', downloadData.data.downloadUrl.substring(0, 50) + '...');
    console.log('   Expira en:', downloadData.data.expiresIn, 'segundos');
    console.log('');

    // 9. Eliminar documento
    console.log('9️⃣ Eliminando documento...');
    const deleteResponse = await fetch(`${BASE_URL}/documents/${documentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    if (!deleteResponse.ok) {
      throw new Error(`Error al eliminar documento: ${deleteResponse.statusText}`);
    }

    const deleteData = await deleteResponse.json();
    console.log('✅ Documento eliminado exitosamente');
    console.log('   Mensaje:', deleteData.message);
    console.log('');

    console.log('🎉 ¡Todas las pruebas completadas exitosamente!');
    console.log('✅ El Centro de Conocimiento está funcionando correctamente con AWS S3');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
    console.error('   Asegúrate de que:');
    console.error('   1. El servidor esté ejecutándose en el puerto 3001');
    console.error('   2. Tengas un token de autenticación válido');
    console.error('   3. Las variables de entorno de AWS estén configuradas');
    console.error('   4. El bucket de S3 exista y tengas permisos');
  } finally {
    // Limpiar archivo de prueba
    if (fs.existsSync('test-document.txt')) {
      fs.unlinkSync('test-document.txt');
      console.log('🧹 Archivo de prueba eliminado');
    }
  }
}

// Ejecutar pruebas
testDocumentAPI();
