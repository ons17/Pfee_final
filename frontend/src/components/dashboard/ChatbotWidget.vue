<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';

const API_KEY = 'AIzaSyBHE4EorFAyech0AXaBCgKOv5O9egcqWWs';
const messages = ref([]);
const newMessage = ref('');
const loading = ref(false);
const messagesContainer = ref(null);

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
                        text: userMessage
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
            content: "Sorry, I couldn't process your request."
        });
    }

    loading.value = false;
}

// Add scroll functionality when new messages arrive
watch(messages, () => {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
    });
}, { deep: true });

// Add initial greeting
onMounted(() => {
    messages.value.push({
        role: 'assistant',
        content: 'Hello! How can I assist you today?'
    });
});
</script>

<template>
    <div class="card">
        <div class="flex align-items-center justify-content-between mb-4">
            <div class="font-semibold text-xl">AI Assistant</div>
            <Button 
                icon="pi pi-refresh" 
                text 
                @click="messages = [{ role: 'assistant', content: 'Hello! How can I assist you today?' }]"
                tooltip="Clear chat"
            />
        </div>
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
    </div>
</template>

<style scoped>
.chatbot-container {
    height: 500px; // Increased height
    background-color: var(--surface-ground);
    border-radius: var(--border-radius);
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
    padding: 1rem;
    gap: 0.5rem;
    border-top: 1px solid var(--surface-border);
}
</style>
