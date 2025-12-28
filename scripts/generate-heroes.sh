#!/bin/bash
# Hero Image Generation Script - Uses external ComfyUI Docker container with FLUX2
# API: http://comfyui:8188

COMFYUI_API="http://comfyui:8188"
OUTPUT_DIR="/home/devuser/workspace/dreamlab-ai-website/public/images/heroes"
mkdir -p "$OUTPUT_DIR"

generate_image() {
    local id="$1"
    local prompt="$2"
    local seed="$3"

    echo "Generating: $id (seed: $seed)"

    # Submit FLUX2 workflow
    local response=$(curl -s -X POST "$COMFYUI_API/prompt" \
        -H "Content-Type: application/json" \
        -d '{
            "prompt": {
                "68": {"inputs": {"model": ["86", 0], "conditioning": ["73", 0]}, "class_type": "BasicGuider"},
                "73": {"inputs": {"guidance": 4.5, "conditioning": ["85", 0]}, "class_type": "FluxGuidance"},
                "74": {"inputs": {"sampler_name": "euler"}, "class_type": "KSamplerSelect"},
                "78": {"inputs": {"vae_name": "flux2-vae.safetensors"}, "class_type": "VAELoader"},
                "79": {"inputs": {"width": 1920, "height": 1080, "batch_size": 1}, "class_type": "EmptyFlux2LatentImage"},
                "80": {"inputs": {"noise": ["87", 0], "guider": ["68", 0], "sampler": ["74", 0], "sigmas": ["94", 0], "latent_image": ["79", 0]}, "class_type": "SamplerCustomAdvanced"},
                "82": {"inputs": {"samples": ["80", 0], "vae": ["78", 0]}, "class_type": "VAEDecode"},
                "85": {"inputs": {"text": ["93", 0], "clip": ["90", 0]}, "class_type": "CLIPTextEncode"},
                "86": {"inputs": {"unet_name": "flux2_dev_fp8mixed.safetensors", "weight_dtype": "default"}, "class_type": "UNETLoader"},
                "87": {"inputs": {"noise_seed": '"$seed"'}, "class_type": "RandomNoise"},
                "89": {"inputs": {"filename_prefix": "hero_'"$id"'", "images": ["82", 0]}, "class_type": "SaveImage"},
                "90": {"inputs": {"clip_name": "mistral_3_small_flux2_bf16.safetensors", "type": "flux2", "device": "default"}, "class_type": "CLIPLoader"},
                "93": {"inputs": {"value": "'"$prompt"'"}, "class_type": "PrimitiveString"},
                "94": {"inputs": {"steps": 28, "width": 1920, "height": 1080}, "class_type": "Flux2Scheduler"}
            }
        }')

    local prompt_id=$(echo "$response" | jq -r '.prompt_id')
    if [ "$prompt_id" = "null" ] || [ -z "$prompt_id" ]; then
        echo "  ERROR: Failed to queue - $(echo "$response" | jq -r '.error.message // .error // "unknown"')"
        return 1
    fi

    echo "  Queued: $prompt_id"

    # Wait for completion (max 5 min)
    local max_wait=300
    local waited=0
    while [ $waited -lt $max_wait ]; do
        sleep 10
        waited=$((waited + 10))

        local status=$(curl -s "$COMFYUI_API/history/$prompt_id" | jq -r '.["'"$prompt_id"'"].status.status_str // empty')

        if [ "$status" = "success" ]; then
            echo "  Completed in ${waited}s"

            # Get filename and download
            local filename=$(curl -s "$COMFYUI_API/history/$prompt_id" | jq -r '.["'"$prompt_id"'"].outputs | to_entries[0].value.images[0].filename')
            curl -s "$COMFYUI_API/view?filename=$filename&type=output" -o "$OUTPUT_DIR/$id.png"
            local size=$(stat -c%s "$OUTPUT_DIR/$id.png" 2>/dev/null || stat -f%z "$OUTPUT_DIR/$id.png" 2>/dev/null)
            echo "  Saved: $id.png ($size bytes)"
            return 0
        elif [ "$status" = "error" ]; then
            echo "  ERROR: Generation failed"
            return 1
        fi

        echo "  Waiting... ${waited}s"
    done

    echo "  TIMEOUT"
    return 1
}

echo "================================"
echo "DreamLab Hero Image Generation"
echo "FLUX2 via ComfyUI @ $COMFYUI_API"
echo "================================"
echo ""

# Course prompts - cinematic 1920x1080
generate_image "ai-commander-week" \
    "Futuristic AI command center with holographic neural network displays, glowing blue and purple data streams, multiple floating screens showing agent orchestration diagrams, dark tech aesthetic with dramatic rim lighting, volumetric fog, cinematic wide shot, 8K photorealistic render" \
    100001

generate_image "virtual-production-master" \
    "Professional LED volume virtual production stage, massive curved LED wall displaying alien planet environment, camera crew silhouettes, real-time Unreal Engine graphics, dramatic cinematic lighting, film set atmosphere, behind-the-scenes of blockbuster movie, 8K photorealistic" \
    100002

generate_image "xr-innovation-intensive" \
    "Person wearing Apple Vision Pro headset in futuristic glass office, holographic 3D interfaces floating in air, mixed reality workspace, soft natural lighting, minimalist design, spatial computing visualization, cinematic depth of field, 8K photorealistic" \
    100003

generate_image "digital-human-mocap" \
    "Motion capture studio with performer in full mocap suit covered in tracking markers, multiple infrared cameras, real-time digital human avatar on large screen, professional lighting rig, high-tech film production environment, cinematic wide shot, 8K photorealistic" \
    100004

generate_image "spatial-audio-production" \
    "Professional immersive audio studio with Dolby Atmos speaker array, large mixing console, acoustic treatment panels, sound wave visualizations floating in 3D space, warm studio lighting, audiophile equipment, cinematic atmosphere, 8K photorealistic" \
    100005

generate_image "engineering-visualisation" \
    "Industrial engineering control room with large screens showing 3D CAD models and digital twin simulations, holographic factory floor visualization, data dashboards, professional tech environment, blue accent lighting, cinematic wide angle, 8K photorealistic" \
    100006

generate_image "neural-content-creation" \
    "Creative AI art studio with multiple screens showing AI-generated artwork in progress, neural network visualization, artist workstation with graphics tablet, colorful generative art on walls, modern creative space, dramatic lighting, 8K photorealistic" \
    100007

generate_image "cyber-infrastructure" \
    "High-security data center with rows of server racks, fiber optic cables with blue light trails, holographic network topology display, green matrix-style code reflections, industrial cooling systems, cinematic cyberpunk atmosphere, 8K photorealistic" \
    100008

generate_image "decentralised-agents" \
    "Futuristic blockchain operations center with floating interconnected nodes, decentralized network visualization, glowing consensus mechanism diagram, multiple operator workstations, dark ambient lighting with cyan and purple accents, cinematic tech aesthetic, 8K photorealistic" \
    100009

generate_image "creative-technology-fundamentals" \
    "Modern creative technology classroom with students at high-end workstations, large display showing code and 3D graphics, collaborative learning environment, natural light from large windows, inspiring educational space, warm atmosphere, 8K photorealistic" \
    100010

generate_image "corporate-immersive" \
    "Luxury corporate retreat in Lake District setting, executive team using VR headsets for strategic planning, holographic data visualization, panoramic mountain views through glass walls, premium modern interior design, golden hour lighting, 8K photorealistic" \
    100011

generate_image "visionflow-power-user" \
    "Advanced computer vision research lab with multiple monitors showing real-time object detection, neural network architecture diagrams, GPU cluster with cooling, researcher analyzing visual data, high-tech environment, dramatic lighting, 8K photorealistic" \
    100012

echo ""
echo "================================"
echo "Generation complete!"
echo "================================"
ls -la "$OUTPUT_DIR"
