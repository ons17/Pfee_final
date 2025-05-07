<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Card from 'primevue/card';

const API_KEY = 'AIzaSyBHE4EorFAyech0AXaBCgKOv5O9egcqWWs';
const messagesContainer = ref(null);
const messages = ref([]);
const newMessage = ref('');
const loading = ref(false);

async function handleInitialGreeting() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: "You are a friendly AI assistant. Please greet the user in French and ask how you can help."
                    }]
                }]
            })
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0].content) {
            messages.value.push({
                role: 'assistant',
                content: data.candidates[0].content.parts[0].text
            });
        }
    } catch (error) {
        console.error('Error:', error);
        messages.value.push({
            role: 'assistant',
            content: "Bonjour! Comment puis-je vous aider aujourd'hui?"
        });
    }
}

watch(messages, () => {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
    });
}, { deep: true });

onMounted(async () => {
    await handleInitialGreeting();
});

async function sendMessage() {
    if (!newMessage.value.trim()) return;

    const userMessage = newMessage.value;
    messages.value.push({ role: 'user', content: userMessage });
    newMessage.value = '';
    loading.value = true;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Previous messages: ${messages.value.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUser: ${userMessage}\nPlease respond in French.`
                    }]
                }]
            })
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0].content) {
            messages.value.push({
                role: 'assistant',
                content: data.candidates[0].content.parts[0].text
            });
        }
    } catch (error) {
        console.error('Error:', error);
        messages.value.push({
            role: 'assistant',
            content: "Désolé, je n'ai pas pu traiter votre demande."
        });
    }

    loading.value = false;
}
</script>

<template>
    <Card>
        <template #title>
            <div class="flex align-items-center justify-content-between">
                <div class="font-semibold text-xl">AI Assistant</div>
                <Button 
                    icon="pi pi-refresh" 
                    text 
                    @click="messages = [{ role: 'assistant', content: 'Hello! How can I assist you today?' }]"
                    tooltip="Clear chat"
                />
            </div>
        </template>
        <template #content>
            <div class="chatbot-container">
                <div class="messages" ref="messagesContainer">
                    <div v-for="(message, index) in messages" 
                        :key="index" 
                        :class="['message', message.role]">
                        {{ message.content }}
                    </div>
                    <div v-if="loading" class="message assistant">
                        <i class="pi pi-spin pi-spinner"></i>
                    </div>
                </div>
                <div class="input-container">
                    <InputText 
                        v-model="newMessage" 
                        placeholder="Type your message..." 
                        @keyup.enter="sendMessage"
                        class="w-full"
                    />
                    <Button 
                        icon="pi pi-send" 
                        @click="sendMessage" 
                        :disabled="loading || !newMessage.trim()"
                        class="ml-2"
                    />
                </div>
            </div>
        </template>
    </Card>
</template>

<style scoped>
.chatbot-container {
    height: 400px;
    display: flex;
    flex-direction: column;
}

.messages {
    flex-grow: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background-color: var(--surface-ground);
    border-radius: var(--border-radius);
    margin-bottom: 1rem;
}

.message {
    padding: 0.5rem 1rem;
    border-radius: 1rem;
    max-width: 80%;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: all 0.2s ease;
}

.message:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.message.user {
    align-self: flex-end;
    background-color: var(--primary-color);
    color: white;
}

.message.assistant {
    align-self: flex-start;
    background-color: var(--surface-200);
}

.input-container {
    display: flex;
    gap: 0.5rem;
}
</style>