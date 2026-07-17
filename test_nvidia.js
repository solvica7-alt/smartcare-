async function test() {
    const tinyImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";
    
    try {
        const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer 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"
            },
            body: JSON.stringify({
                model: "meta/llama-3.2-11b-vision-instruct",
                messages: [
                    {
                        role: "user",
                        content: `What is this image? Reply with one word. <img src="data:image/png;base64,${tinyImage}" />`
                    }
                ],
                max_tokens: 10
            })
        });
        
        console.log("Status:", res.status);
        console.log("Response:", await res.text());
    } catch(e) {
        console.error(e);
    }
}
test();
