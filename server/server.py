from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

app = FastAPI()

MODEL_NAME = "bigcode/starcoder"

try:
    print(f"loading model {MODEL_NAME} from hugging face")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForCausalLM.from_pretrained(MODEL_NAME)
    model.eval()
    print(f"model {MODEL_NAME} loaded")
except Exception as e:
    print(f"error loading model {MODEL_NAME} from hugging_face : {e} ")
    tokenizer = None
    model = None

class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 512
    temperature: float = 0.7
    top_k: int = 50

@app.get('/health')
async def health():
    if model and tokenizer:
        return {"status": "ok","model":  f"{MODEL_NAME}"}
    else:
        raise HTTPException(status_code=500, detail=f"model {MODEL_NAME} not loaded")
    
@app.post('/generate')
async def generate(request: GenerateRequest):
    if not model or not tokenizer:
        raise HTTPException(status_code=500, detail=f"model {MODEL_NAME} not loaded")
    try:
        inputs = tokenizer(
            request.prompt,
            return_tensors="pt",
            truncation=True,
            max_length=1024,
            padding=True  # Добавляем padding
        )
        
        
        outputs = model.generate(
            inputs.input_ids,
            attention_mask=inputs.attention_mask,  # Передаём attention_mask
            max_new_tokens=request.max_tokens,
            temperature=request.temperature,  # Используется для управления креативностью
            top_k=request.top_k,              # Используется для сэмплинга
            pad_token_id=tokenizer.eos_token_id,
            do_sample=True                    # Включаем режим стохастической генерации
        )
        
        generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        return {"response": generated_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"error generating text : {e}")

