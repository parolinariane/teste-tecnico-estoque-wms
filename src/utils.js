function normalizarCodigo(codigo) {
    return codigo.trim().padStart(7, "0");
}

function converterValor(valor) {
    return Number(
        valor
            .trim()
            .replace(/\./g, "")
            .replace(",", ".")
    );
}

function normalizarData(data) {
    const valor = data.trim();

    // Já está no formato DD/MM/AAAA
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
        return valor;
    }

    // Formato AAAA-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        const [ano, mes, dia] = valor.split("-");

        return `${dia}/${mes}/${ano}`;
    }

    return valor;
}

module.exports = {
    normalizarCodigo,
    converterValor,
    normalizarData
};