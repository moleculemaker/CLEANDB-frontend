export function getSeq(seq: string) {
    const sequenceName = seq.split('\n')[0];
    const sequence = seq.split('\n')[1];
    return { sequenceName, sequence };
}

export function getFasta(sequenceName: string, sequence: string) {
    const testStr = `${sequenceName}\n${sequence}`;
    return testStr.startsWith('>') ? testStr : `>${testStr}`;
}