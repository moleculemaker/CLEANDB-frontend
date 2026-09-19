export function getSingleSeq(seq: string) {
    const sequenceName = seq.split('\n')[0];
    const sequence = seq.split('\n').slice(1).join('');
    return { sequenceName, sequence };
}

export function getFasta(sequenceName: string, sequence: string) {
    const testStr = `${sequenceName}\n${sequence}`;
    return testStr.startsWith('>') ? testStr : `>${testStr}`;
}

/**
 * Residues in a sequence body. A single trailing `*` is a stop codon rather than a
 * residue, and the sequence validator drops one before it measures; every other
 * counter has to agree with that one or the same sequence measures differently in
 * different places. The server counts the same way.
 */
export function residueCount(sequence: string) {
    return sequence.replace(/\*$/, '').length;
}
