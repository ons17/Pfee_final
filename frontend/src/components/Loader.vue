<!-- src/components/Loader.vue -->
<template>
    <div class="loader"></div>
</template>

<style scoped>
.loader {
    width: 120px;
    height: 22px;
    border-radius: 40px;
    color: #10ffa4;
    border: 2px solid;
    position: relative;
    overflow: hidden;
    margin: 20px auto; /* Added some margin */
}
.loader::before {
    content: '';
    position: absolute;
    margin: 2px;
    width: 14px;
    top: 0;
    bottom: 0;
    left: -20px;
    border-radius: inherit;
    background: currentColor;
    box-shadow: -10px 0 12px 3px currentColor;
    clip-path: polygon(0 5%, 100% 0, 100% 100%, 0 95%, -30px 50%);
    animation: l14 1s infinite linear;
}
@keyframes l14 {
    100% {
        left: calc(100% + 20px);
    }
}
</style>
