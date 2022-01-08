export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(() => r(), ms));
export const getCombinations = <ArrayType = any>(valuesArray: ArrayType[]): ArrayType[][] => {
    let combi = [];
    let temp = [];
    let slent = Math.pow(2, valuesArray.length);

    for (let i = 0; i < slent; i++) {
        temp = [];
        for (let j = 0; j < valuesArray.length; j++) {
            if (i & Math.pow(2, j)) {
                temp.push(valuesArray[j]);
            }
        }
        if (temp.length > 0) {
            combi.push(temp);
        }
    }

    return combi;
};
