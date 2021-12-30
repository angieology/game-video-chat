export function closeEnough(positionA, positionB) {
    const distance = Math.sqrt((positionA.x - positionB.x) ** 2 + (positionA.y - positionB.y) ** 2)
    return distance < 50;
}
