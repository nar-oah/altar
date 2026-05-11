<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import { TresCanvas } from "@tresjs/core";
import { OrbitControls, useGLTF } from "@tresjs/cientos";
import PoissonDiskSampling from "poisson-disk-sampling";
import { Group, Object3D } from "three";

type AshItem = {
  id: number;
  text: string;
  model: Object3D;
  position: [number, number, number];
  rotation: [number, number, number];
};

const MESSAGE_ENDPOINT = "https://aws.naroah.top/altar/messages";
const DRACO_DECODER_PATH = "/draco/";

const hasStarted = ref(false);
const hasSubmitted = ref(false);
const sceneReady = ref(false);
const messageText = ref<string | null>(null);
const messages = ref<string[]>([]);
const ashItems = shallowRef<AshItem[]>([]);
const tribute = ref("");
const promptText = ref("模型加载中...请稍后...");
const incenseGroup = shallowRef(new Group());
const ghost = shallowRef<Object3D | null>(null);

const { state: altarModel } = useGLTF("/models/main.glb", {
  draco: true,
  decoderPath: DRACO_DECODER_PATH,
});
const { state: ashModel } = useGLTF("/models/ashes.glb", {
  draco: true,
  decoderPath: DRACO_DECODER_PATH,
});

const canUseAltar = computed(() => sceneReady.value && altarModel.value !== null);

let sceneInitialized = false;
let ashId = 0;

watch(altarModel, setupAltarScene, { immediate: true });
watch(ashModel, () => {
  if (hasStarted.value) {
    rebuildAshes();
  }
});
watch(messages, () => {
  if (hasStarted.value) {
    rebuildAshes();
  }
});

onMounted(() => {
  void loadMessages();

  window.setTimeout(() => {
    if (!sceneReady.value) {
      promptText.value = "模型加载失败，请检查 /models 和 /draco/ 是否可访问";
    }
  }, 12_000);
});

function setupAltarScene() {
  const model = altarModel.value;

  if (!model || sceneInitialized) {
    return;
  }

  const incenseNodes: Object3D[] = [];
  model.scene.traverse((child) => {
    if (child.name.startsWith("incense_")) {
      incenseNodes.push(child);
    }

    if (child.name === "ghost") {
      ghost.value = child;
      child.visible = false;
    }
  });

  incenseGroup.value.name = "custom_incense_group";
  incenseNodes.forEach((child) => incenseGroup.value.add(child));
  incenseGroup.value.visible = false;
  model.scene.add(incenseGroup.value);

  sceneInitialized = true;
  sceneReady.value = true;
  promptText.value = "点击祭坛上香...";
}

function handleAltarClick() {
  if (!canUseAltar.value) {
    return;
  }

  hasStarted.value = true;

  if (incenseGroup.value.visible) {
    showGhost();
    showMessage("吓你一跳！！！");
    return;
  }

  incenseGroup.value.visible = true;
  rebuildAshes();
}

function showGhost() {
  if (!ghost.value) {
    return;
  }

  ghost.value.visible = true;
  window.setTimeout(() => {
    if (ghost.value) {
      ghost.value.visible = false;
    }
  }, 5_000);
}

function rebuildAshes() {
  const baseAsh = ashModel.value?.scene;

  if (!baseAsh) {
    ashItems.value = [];
    return;
  }

  const points = new PoissonDiskSampling({
    shape: [10, 10],
    minDistance: 2.5,
    tries: 20,
  }).fill();

  ashItems.value = messages.value.map((text, index) => {
    const [x, z] = points[index] ?? fallbackPoint(index);

    return {
      id: ashId++,
      text,
      model: baseAsh.clone(true),
      position: [x - 5, 0, z - 5],
      rotation: [0, Math.random() * Math.PI * 2, 0],
    };
  });
}

function fallbackPoint(index: number): [number, number] {
  const angle = index * 2.399963229728653;
  const radius = 2 + (index % 5) * 0.7;

  return [5 + Math.cos(angle) * radius, 5 + Math.sin(angle) * radius];
}

function showMessage(text: string) {
  messageText.value = text;
  window.setTimeout(() => {
    if (messageText.value === text) {
      messageText.value = null;
    }
  }, 3_000);
}

async function loadMessages() {
  try {
    const response = await fetch(MESSAGE_ENDPOINT);

    if (!response.ok) {
      throw new Error(`GET ${response.status}`);
    }

    messages.value = normalizeMessages(await response.json());
  } catch (error) {
    console.warn("消息接口不可用，已使用空列表。", error);
    messages.value = [];
  }
}

async function postMessage(text: string) {
  try {
    const response = await fetch(MESSAGE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });

    if (!response.ok) {
      throw new Error(`POST ${response.status}`);
    }
  } catch (error) {
    console.warn("悼词提交失败，本地仍会显示。", error);
  }
}

function normalizeMessages(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (item && typeof item === "object" && "content" in item) {
        const content = (item as { content: unknown }).content;
        return typeof content === "string" ? content : "";
      }

      return "";
    })
    .filter((item) => item.trim().length > 0);
}

function submitTribute() {
  const text = tribute.value.trim();

  if (!text || hasSubmitted.value) {
    return;
  }

  hasSubmitted.value = true;
  messages.value = [...messages.value, text];
  void postMessage(text);
}
</script>

<template>
  <TresCanvas window-size clear-color="#82DBC5" alpha shadow>
    <TresPerspectiveCamera :position="[8, 10, 8]" :look-at="[0, 0, 0]" />
    <OrbitControls :enable-zoom="false" :enable-pan="false" />
    <TresAmbientLight :intensity="0.8" />
    <TresDirectionalLight :position="[-5, 5, 5]" :intensity="1.5" cast-shadow />

    <Suspense>
      <primitive
        v-if="altarModel"
        :object="altarModel.scene"
        @click="handleAltarClick"
      />
    </Suspense>

    <TresGroup v-if="ashItems.length > 0">
      <primitive
        v-for="item in ashItems"
        :key="item.id"
        :object="item.model"
        :position="item.position"
        :rotation="item.rotation"
        @click.stop="showMessage(item.text)"
      />
    </TresGroup>
  </TresCanvas>

  <div class="overlay">
    <Transition name="fade">
      <div v-if="messageText" class="message-bubble">{{ messageText }}</div>
    </Transition>

    <input
      v-if="hasStarted"
      v-model="tribute"
      class="prompt-text lit"
      type="text"
      placeholder="🙏 🕯️ 悼词 🕯️ 🙏"
      :disabled="hasSubmitted"
      @change="submitTribute"
    />
    <div v-else class="prompt-text">{{ promptText }}</div>
  </div>
</template>

<style scoped>
:global(html),
:global(body),
:global(#app) {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: #82dbc5;
}

.overlay {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: auto;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  box-sizing: border-box;
  pointer-events: none;
  z-index: 10;
}

.message-bubble {
  background: rgb(0 0 0 / 50%);
  color: #f0f0f0;
  padding: 10px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: inline-block;
  font-weight: 700;
  pointer-events: auto;
}

.prompt-text {
  font-family: Georgia, serif;
  font-size: 1.5rem;
  color: #f0f0f0;
  background-color: rgb(0 0 0 / 50%);
  display: block;
  margin: 0 auto;
  width: fit-content;
  max-width: calc(100vw - 40px);
  padding: 10px 20px;
  border: 0;
  border-radius: 8px;
  box-sizing: border-box;
  text-align: center;
  transition: all 0.5s ease-in-out;
  pointer-events: auto;
}

.prompt-text.lit {
  color: #ffcc66;
  font-size: 1.8rem;
}

.prompt-text:disabled {
  opacity: 0.85;
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.5s,
    transform 0.5s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
