"""
Service for generating medical notes using AWS Bedrock and Claude.
"""
import os
import json

from unsloth import FastLanguageModel
import time
import traceback


_llm_model = None
_llm_tokenizer = None

def get_llm_model():
    """Get or initialize the LLM model singleton"""
    global _llm_model, _llm_tokenizer
    if _llm_model is None or _llm_tokenizer is None:
        print("Initializing LLM model...")
        start_time = time.time()
        try:
            _llm_model, _llm_tokenizer = FastLanguageModel.from_pretrained(
                model_name = 'Simranjit/llama8bnabla',
                max_seq_length = 12000,
                load_in_4bit = True,
                token = os.environ.get('HF_TOKEN')
            )
            FastLanguageModel.for_inference(_llm_model)
            print(f"LLM model initialized successfully in {time.time() - start_time:.2f} seconds")
        except Exception as e:
            print(f"Error initializing LLM model: {e}")
            raise
    return _llm_model, _llm_tokenizer

async def generate_medical_note(transcript: str, reasons: list) -> str:
    """
    Generate a medical note from transcript and consultation reasons.
    """
    try:
        note = generate_unsloth_note(transcript)
        print("your note is ready!!!!!", note)
        return note
    except Exception as e:

        print(f"Error generating note with Unsloth: {e}")
        traceback.print_exc()


        return generate_fallback_note(transcript, reasons)


def generate_fallback_note(transcript: str, reasons: list) -> str:
    """Generate a simple fallback note when AI generation fails"""
    try:

        reason_text = ', '.join(reasons) if reasons else "Consultation générale"

        return f"""# Note Médicale (Générée automatiquement)


{reason_text}


{transcript}


Une synthèse n'a pas pu être générée en raison d'une erreur technique.
La transcription ci-dessus est fournie pour référence.
"""
    except Exception as e:
        print(f"Even fallback note generation failed: {e}")

        return f"# Transcription\n\n{transcript}"

def generate_unsloth_note(transcript):
    """Generate a note using the Unsloth model with error handling"""
    if not transcript or len(transcript.split()) < 10:
        return generate_fallback_note(transcript, [])

    try:
        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name = os.environ.get('MODEL_NAME', "Simranjit/llama8bnabla"),
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
        g = model.generate(
            input_ids = inputs,
            streamer = text_streamer,
            max_new_tokens = 1024,
            use_cache = True
        )

        len_inp = len(tokenizer.apply_chat_template(messages, skip_special_tokens=False, tokenize = False, add_generation_prompt = False))
        note = tokenizer.decode(g[0], skip_special_tokens=False)[len_inp:]


        if not note or len(note) < 50:
            print("Generated note was too short or empty, using fallback")
            return generate_fallback_note(transcript, [])

        return note
    except Exception as e:
        print(f"Error in generate_unsloth_note: {e}")
        traceback.print_exc()
        return generate_fallback_note(transcript, [])




def call_claude_via_bedrock(prompt: str):
    """
    Call Claude via AWS Bedrock.
    Uncomment and implement when ready.
    """
    import boto3

    num_words = len(prompt.split(' '))
    if num_words < 75:
        return "La transcription était trop courte pour générer une note"

    try:
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
            modelId="anthropic.claude-3-sonnet-20240229-v1:0",
            contentType="application/json",
            accept="application/json",
            body=json.dumps(request_body)
        )

        response_body = json.loads(response["body"].read())
        return response_body["content"][0]["text"]
    except Exception as e:
        print(f"Error calling Claude via Bedrock: {e}")
        return generate_fallback_note(prompt, [])
