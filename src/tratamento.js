const {
    validarData,
    estaVencido
} = require("./validacoes");

function removerDuplicidades(registros) {
    const registrosUnicos = [];
    const duplicidades = [];
    const chavesVistas = new Set();

    for (const registro of registros) {
        const chave = [
            registro.cd,
            registro.codigo,
            registro.lote,
            registro.validade
        ].join("|");

        if (chavesVistas.has(chave)) {
            duplicidades.push(registro);
            continue;
        }

        chavesVistas.add(chave);
        registrosUnicos.push(registro);
    }

    return {
        registrosUnicos,
        duplicidades
    };
}

function identificarDivergenciasDescricao(registros) {
    const descricoesPorCodigo = new Map();

    for (const registro of registros) {
        if (!descricoesPorCodigo.has(registro.codigo)) {
            descricoesPorCodigo.set(registro.codigo, []);
        }

        descricoesPorCodigo.get(registro.codigo).push(registro);
    }

    const divergencias = [];

    for (const [codigo, registrosProduto] of descricoesPorCodigo) {
        const descricoes = new Map();

        for (const registro of registrosProduto) {
            const descricao = registro.descricao.trim();

            if (!descricoes.has(descricao)) {
                descricoes.set(descricao, 0);
            }

            descricoes.set(
                descricao,
                descricoes.get(descricao) + 1
            );
        }

        if (descricoes.size > 1) {
            divergencias.push({
                codigo,
                descricoes: Object.fromEntries(descricoes)
            });
        }
    }

    return divergencias;
}
function consolidarProdutos(registros) {
    const produtos = new Map();
    const vendasContabilizadas = new Set();

    for (const registro of registros) {
        if (!produtos.has(registro.codigo)) {
            produtos.set(registro.codigo, {
                codigo: registro.codigo,
                descricao: registro.descricao,
                saldo_campinas: 0,
                saldo_bh: 0,
                saldo_sao_caetano: 0,
                saldo_londrina: 0,
                saldo_total: 0,
                vendas_mes_ant_total: 0,
                cobertura_meses: null
            });
        }

        const produto = produtos.get(registro.codigo);

        // se o produto existir em Campinas, a descrição da matriz tem prioridade
        if (registro.cd === "Campinas") {
            produto.descricao = registro.descricao;
        }

        const saldoDisponivel = obterSaldoDisponivel(registro);

        const chaveVenda = `${registro.codigo}|${registro.cd}`;

        // vendas_mes_ant pertence ao produto/CD, e não ao lote.
        if (!vendasContabilizadas.has(chaveVenda)) {
            produto.vendas_mes_ant_total += registro.vendas_mes_ant;
            vendasContabilizadas.add(chaveVenda);
        }

        switch (registro.cd) {
            case "Campinas":
                produto.saldo_campinas += saldoDisponivel;
                break;

            case "Belo Horizonte":
                produto.saldo_bh += saldoDisponivel;
                break;

            case "São Caetano":
                produto.saldo_sao_caetano += saldoDisponivel;
                break;

            case "Londrina":
                produto.saldo_londrina += saldoDisponivel;
                break;
        }
    }

    const consolidado = Array.from(produtos.values());

    for (const produto of consolidado) {
        produto.saldo_total =
            produto.saldo_campinas +
            produto.saldo_bh +
            produto.saldo_sao_caetano +
            produto.saldo_londrina;

        if (produto.vendas_mes_ant_total > 0) {
            produto.cobertura_meses = Number(
                (
                    produto.saldo_total /
                    produto.vendas_mes_ant_total
                ).toFixed(2)
            );
        } else {
            produto.cobertura_meses = null;
        }
    }

    return consolidado;
}


function obterSaldoDisponivel(registro) {
    if (registro.saldo < 0) {
        return 0;
    }

    if (!validarData(registro.validade)) {
        return 0;
    }

    if (estaVencido(registro.validade)) {
        return 0;
    }

    return registro.saldo;
}

function escolherDescricao(registrosProduto) {
    const registroCampinas = registrosProduto.find(
        registro => registro.cd === "Campinas"
    );

    if (registroCampinas) {
        return registroCampinas.descricao;
    }

    return registrosProduto[0].descricao;
}


module.exports = {
    removerDuplicidades,
    identificarDivergenciasDescricao,
    consolidarProdutos,
    escolherDescricao
};