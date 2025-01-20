# pip install -q transformers
# from transformers import AutoModelForCausalLM, AutoTokenizer

# checkpoint = "bigcode/starcoder"
# device = "mps"

# tokenizer = AutoTokenizer.from_pretrained(checkpoint)
# model = AutoModelForCausalLM.from_pretrained(checkpoint).to(device)

# inputs = tokenizer.encode("def print_hello_world():", return_tensors="pt").to(device)
# outputs = model.generate(inputs)
# print(tokenizer.decode(outputs[0]))



# from transformers import AutoModelForCausalLM, AutoTokenizer

# checkpoint = "bigcode/starcoder"

# tokenizer = AutoTokenizer.from_pretrained(checkpoint)
# model = AutoModelForCausalLM.from_pretrained(
#     checkpoint,
#     device_map="auto"  # Автоматически распределяет слои между GPU и CPU
# )

# inputs = tokenizer.encode("def print_hello_world():", return_tensors="pt").to("mps")
# outputs = model.generate(inputs)
# print(tokenizer.decode(outputs[0]))

from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

# Параметры
checkpoint = "bigcode/starcoder"
device = "mps"  # Используем Metal Performance Shaders (GPU на macOS)

# Загрузка токенизатора и модели
print(f"Загрузка модели {checkpoint}...")
tokenizer = AutoTokenizer.from_pretrained(checkpoint)
model = AutoModelForCausalLM.from_pretrained(
    checkpoint,
    torch_dtype=torch.float16  # Используем меньшую точность для экономии памяти
).to(device)

# Установка pad_token, если он отсутствует
tokenizer.pad_token = tokenizer.eos_token

# Входной текст
prompt = "def print_hello_world():"

# Токенизация
inputs = tokenizer(
    prompt,
    return_tensors="pt",
    truncation=True,  # Обрезаем до максимальной длины
    max_length=1024,  # Максимальный контекст
    padding=True      # Добавляем паддинг
)

# Перенос данных на устройство
inputs = {key: value.to(device) for key, value in inputs.items()}

# Генерация текста
print("\nНачало генерации...")
outputs = model.generate(
    inputs["input_ids"],
    attention_mask=inputs["attention_mask"],
    max_new_tokens=64,  # Максимальное количество новых токенов
    temperature=0.7,    # Температура для генерации (регулирует креативность)
    top_k=40,           # Топ-K для ограничения выборки токенов
    pad_token_id=tokenizer.eos_token_id,  # Указываем паддинг токен
    do_sample=True      # Включаем стохастическую генерацию
)

# Декодирование результата
output_text = tokenizer.decode(outputs[0], skip_special_tokens=True)

# Вывод результата
print("\nСгенерированный текст:")
print(output_text)