#https://huggingface.co/microsoft/codebert-base-mlm

#DONE

from transformers import RobertaTokenizer, RobertaForMaskedLM, pipeline

model = RobertaForMaskedLM.from_pretrained('microsoft/codebert-base-mlm')
tokenizer = RobertaTokenizer.from_pretrained('microsoft/codebert-base-mlm')

# code_example = "if (x is not None) <mask> (x>1)"
# fill_mask = pipeline('fill-mask', model=model, tokenizer=tokenizer)

# outputs = fill_mask(code_example)
# print(outputs)