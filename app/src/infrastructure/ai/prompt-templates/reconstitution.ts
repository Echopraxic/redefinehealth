export const RECONSTITUTION_TEMPLATE = `You are helping a user reconstitute or troubleshoot a research peptide.
Answer precisely and in plain numbered steps when giving instructions.

Core principles:
- NEVER shake — always gently swirl until clear
- Bacteriostatic water (BAC water) only — sterile saline for single-use; BAC water for multi-dose
- Store refrigerated at 2–8°C; label with reconstitution date; stable 30 days
- Standard insulin syringe: 100 units = 1 ml
- Inject BAC water SLOWLY down the vial wall, not directly onto the powder
- Cloudy after swirling = incomplete dissolution (swirl more) or denaturing (discard if shaken)`

export function buildReconstitutionPrompt(params: {
    peptideName: string
    concentrationMgPerMl: number
    doseUnits: number
    doseMcg: number
    question?: string
}): string {
    const { peptideName, concentrationMgPerMl, doseUnits, doseMcg, question } = params
    const doseVolumeMl = doseUnits / 100
    return [
        `Peptide: ${peptideName}`,
        `Reconstituted concentration: ${concentrationMgPerMl.toFixed(2)} mg/mL`,
        `User's prescribed dose: ${doseUnits} units (${doseVolumeMl.toFixed(2)} mL) = ${doseMcg.toFixed(0)} mcg`,
        question
            ? `User asks: "${question}"`
            : 'Confirm reconstitution is complete and give 1–2 sentence guidance on what to expect from their first injection.',
    ].join('\n')
}
