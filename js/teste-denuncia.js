/**
 * teste-denuncia.js - Script para testar permissões do Firestore
 * Abra o console do navegador (F12) e execute este arquivo para diagnosticar problemas
 */

// Importar as funções necessárias
import { auth, db, criarDenuncia, observeAuthState } from './firebase-config.js';

window.testarDenuncia = async function() {
    console.log('=== INICIANDO TESTE DE DENÚNCIA ===\n');

    // 1. Verificar autenticação
    console.log('1️⃣ Verificando autenticação...');
    const user = auth.currentUser;
    
    if (!user) {
        console.error('❌ ERRO: Você não está autenticado!');
        console.log('   Faça login primeiro na página.');
        return;
    }
    
    console.log('✅ Usuário autenticado:', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
    });

    // 2. Testar criação de denúncia
    console.log('\n2️⃣ Testando criação de denúncia...');
    
    const testDenuncia = {
        petId: 'test-pet-' + Date.now(),
        petName: 'Pet de Teste',
        reporterName: user.displayName || user.email,
        reporterEmail: user.email,
        motivo: 'Teste - Por favor, ignore',
        ownerIdentifier: 'test-owner'
    };
    
    console.log('Tentando criar denúncia com dados:', testDenuncia);
    
    try {
        const reportId = await criarDenuncia(testDenuncia);
        console.log('✅ SUCESSO! Denúncia criada com ID:', reportId);
        console.log('\n🎉 Suas permissões estão corretas!');
        console.log('As regras do Firestore foram aplicadas corretamente.');
        return true;
    } catch (error) {
        console.error('❌ ERRO ao criar denúncia:', error);
        console.error('Código de erro:', error.code);
        console.error('Mensagem:', error.message);
        
        // Análise do erro
        console.log('\n📋 DIAGNÓSTICO:');
        if (error.message && error.message.includes('permission')) {
            console.error('   → Problema: Permissões insuficientes no Firestore');
            console.error('   → Solução:');
            console.error('      1. Abra o Firebase Console (console.firebase.google.com)');
            console.error('      2. Vá para Firestore Database > Regras');
            console.error('      3. Cole as regras do arquivo CONFIGURACAO_FIREBASE.md');
            console.error('      4. Clique em Publicar');
            console.error('      5. Recarregue esta página e tente novamente');
        } else {
            console.error('   → Problema desconhecido. Verifique o erro acima.');
        }
        
        return false;
    }
};

window.testarConexaoFirebase = async function() {
    console.log('=== TESTE DE CONEXÃO FIREBASE ===\n');
    
    console.log('1️⃣ Verificando Firebase Firestore...');
    console.log('   DB:', db ? '✅ Inicializado' : '❌ Não inicializado');
    
    console.log('\n2️⃣ Verificando Firebase Auth...');
    console.log('   Auth:', auth ? '✅ Inicializado' : '❌ Não inicializado');
    console.log('   Usuário atual:', auth?.currentUser?.email || 'Nenhum (faça login)');
    
    console.log('\n💡 Dica: Execute testarDenuncia() para testar as permissões');
};

// Executar verificação de conexão automaticamente
console.log('🔧 Scripts de diagnóstico carregados!');
console.log('Execute no console:');
console.log('  - testarConexaoFirebase() → Verificar conexão com Firebase');
console.log('  - testarDenuncia() → Testar criação de denúncia');
testarConexaoFirebase();
