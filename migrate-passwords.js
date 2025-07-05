/*
Script de migración para convertir contraseñas de texto plano a bcrypt
Ejecutar UNA SOLA VEZ después de implementar bcrypt
*/

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function migratePasswords() {
    try {
        // Conectar a MongoDB
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chessdb';
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Conectado a MongoDB');
        
        // Buscar todos los usuarios
        const users = await User.find({});
        console.log(`📋 Encontrados ${users.length} usuarios`);
        
        let migratedCount = 0;
        
        for (let user of users) {
            // Verificar si la contraseña ya está hasheada (bcrypt hashes empiezan con $2)
            if (!user.password.startsWith('$2')) {
                console.log(`🔄 Migrando contraseña para usuario: ${user.username}`);
                
                // Hash de la contraseña actual
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(user.password, saltRounds);
                
                // Actualizar usuario
                user.password = hashedPassword;
                await user.save();
                
                migratedCount++;
                console.log(`✅ Contraseña migrada para: ${user.username}`);
            } else {
                console.log(`⏭️  Contraseña ya hasheada para: ${user.username}`);
            }
        }
        
        console.log(`\n🎉 Migración completada!`);
        console.log(`📊 Total usuarios migrados: ${migratedCount}`);
        console.log(`📊 Total usuarios ya seguros: ${users.length - migratedCount}`);
        
    } catch (error) {
        console.error('❌ Error durante la migración:', error);
    } finally {
        // Cerrar conexión
        await mongoose.connection.close();
        console.log('🔌 Conexión cerrada');
        process.exit(0);
    }
}

// Ejecutar migración
console.log('🚀 Iniciando migración de contraseñas...');
console.log('⚠️  IMPORTANTE: Este script debe ejecutarse UNA SOLA VEZ\n');

migratePasswords();
