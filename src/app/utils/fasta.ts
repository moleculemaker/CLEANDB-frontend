export function getSingleSeq(seq: string) {
    const sequenceName = seq.split('\n')[0];
    const sequence = seq.split('\n').slice(1).join('');
    return { sequenceName, sequence };
}

export function getFasta(sequenceName: string, sequence: string) {
    const testStr = `${sequenceName}\n${sequence}`;
    return testStr.startsWith('>') ? testStr : `>${testStr}`;
}