"""
Service for generating medical notes using AWS Bedrock and Claude.
"""

import os
import json
from unsloth import FastLanguageModel

async def generate_medical_note(transcript: str, reasons: list) -> str:
    """
    Generate a medical note from transcript and consultation reasons.
    """
    note = generate_unsloth_note(transcript)
    print("your note is ready!", note)
    return note


def call_claude_via_bedrock(prompt: str):
    """
    Call Claude via AWS Bedrock.
    Uncomment and implement when ready.
    """

    num_words = prompt.split(' ')
    if len(num_words) < 75:
        return "La transcription était trop courte pour générer une note"

    bedrock_runtime = boto3.client(
        service_name="bedrock-runtime",
        region_name="us-east-1",
        aws_access_key_id=os.environ.get("NABL_AK"),
        aws_secret_access_key=os.environ.get("NABL_SAK")
    )

    request_body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 2000,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.1
    }

    response = bedrock_runtime.invoke_model(
        modelId="",
        contentType="application/json",
        accept="application/json",
        body=json.dumps(request_body)
    )

    response_body = json.loads(response["body"].read())
    return response_body["content"][0]["text"]

def generate_unsloth_note(transcript):

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name = '',
        max_seq_length = 12000,
        load_in_4bit = True,
        token = os.environ.get('HF_TOKEN')
    )
    from transformers import TextStreamer
    FastLanguageModel.for_inference(model)

    messages = [

        {"role": "system", "content": "Please generate a detailed and thorough medical note using this transcript."},
        {"role": "user", "content": transcript}
    ]
    inputs = tokenizer.apply_chat_template(messages, tokenize = True, add_generation_prompt = True, return_tensors = "pt").to("cuda")

    text_streamer = TextStreamer(tokenizer)
    g = model.generate(input_ids = inputs, streamer = text_streamer, max_new_tokens = 1024, use_cache = True)
    print(g)
    len_inp = len(tokenizer.apply_chat_template(messages, skip_special_tokens=False, tokenize = False, add_generation_prompt = False))
    note=tokenizer.decode(g[0], skip_special_tokens=False)[len_inp:]
    return note
