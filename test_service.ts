import { analyzeMedicalImage } from './services/geminiService';

async function test() {
    const tinyImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";
    
    const patientInfo = {
        id: "1",
        age: 30,
        symptoms: ["Headache"],
        detailedSymptoms: "Severe headache for 2 days",
        notes: "No prior history"
    };

    console.log("Starting analyzeMedicalImage end-to-end test...");
    
    try {
        const result = await analyzeMedicalImage(
            [{ data: tinyImage, mimeType: "image/png" }],
            patientInfo
        );
        
        console.log("\nSuccess! Parsed AnalysisResult:");
        console.log(JSON.stringify(result, null, 2));
    } catch(e) {
        console.error("Test failed:", e);
    }
}
test();
