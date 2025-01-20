from mlx_lm import load, generate

model, tokenizer = load("mlx-community/Qwen2.5-Coder-32B-Instruct-4bit")

#DOWNLOADING ERR

# prompt="hello"

# if hasattr(tokenizer, "apply_chat_template") and tokenizer.chat_template is not None:
#     messages = [{"role": "user", "content": prompt}]
#     prompt = tokenizer.apply_chat_template(
#         messages, tokenize=False, add_generation_prompt=True
#     )

# response = generate(model, tokenizer, prompt=prompt, verbose=True)
