# https://huggingface.co/deepseek-ai/deepseek-coder-6.7b-base

#DOWNLOADING


from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
tokenizer = AutoTokenizer.from_pretrained("deepseek-ai/deepseek-coder-6.7b-base", trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained("deepseek-ai/deepseek-coder-6.7b-base", trust_remote_code=True)
exit()


# input_text = "#write a quick sort algorithm"
# inputs = tokenizer(input_text, return_tensors="pt").cuda()
# outputs = model.generate(**inputs, max_length=128)
# print(tokenizer.decode(outputs[0], skip_special_tokens=True))
