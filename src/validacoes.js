const DATA_EXTRACAO = new Date(2026, 7, 20);

function validarCodigo(codigo) {
    return /^\d{7}$/.test(codigo);
}

function validarLote(lote) {
    return lote !== null && lote !== undefined && lote.trim() !== "";
}

function validarSaldo(saldo) {
    return saldo >= 0;
}

function validarData(data) {
    const partes = data.split("/");

    if (partes.length !== 3) {
        return false;
    }

    const dia = Number(partes[0]);
    const mes = Number(partes[1]);
    const ano = Number(partes[2]);

    if (
        !Number.isInteger(dia) ||
        !Number.isInteger(mes) ||
        !Number.isInteger(ano)
    ) {
        return false;
    }

    if (mes < 1 || mes > 12 || dia < 1) {
        return false;
    }

    const dataTeste = new Date(ano, mes - 1, dia);

    return (
        dataTeste.getFullYear() === ano &&
        dataTeste.getMonth() === mes - 1 &&
        dataTeste.getDate() === dia
    );
}

function estaVencido(validade) {
    const [dia, mes, ano] = validade.split("/").map(Number);

    const dataValidade = new Date(ano, mes - 1, dia);
    const hoje = new Date(DATA_EXTRACAO);

    hoje.setHours(0, 0, 0, 0);
    dataValidade.setHours(0, 0, 0, 0);

    return dataValidade < hoje;
}

function estaPertoDaValidade(validade) {
    const [dia, mes, ano] = validade.split("/").map(Number);

    const dataValidade = new Date(ano, mes - 1, dia);
    const hoje = new Date(DATA_EXTRACAO);

    hoje.setHours(0, 0, 0, 0);
    dataValidade.setHours(0, 0, 0, 0);

    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + 180);

    return dataValidade >= hoje && dataValidade <= limite;
}


module.exports = {
    validarCodigo,
    validarLote,
    validarSaldo,
    validarData,
    estaVencido,
    estaPertoDaValidade
};