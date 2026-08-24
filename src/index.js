const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { stringify } = require("csv-stringify/sync");

const {
    normalizarCodigo,
    converterValor,
    normalizarData
} = require("./utils");

const {
    validarCodigo,
    validarLote,
    validarSaldo,
    validarData,
    estaVencido,
    estaPertoDaValidade
} = require("./validacoes");

const {
    removerDuplicidades,
    identificarDivergenciasDescricao,
    consolidarProdutos
} = require("./tratamento");

const arquivos = [
    {
        cd: "Campinas",
        arquivo: "estoque_campinas.csv"
    },
    {
        cd: "Belo Horizonte",
        arquivo: "estoque_bh.csv"
    },
    {
        cd: "São Caetano",
        arquivo: "estoque_sao_caetano.csv"
    },
    {
        cd: "Londrina",
        arquivo: "estoque_londrina.csv"
    }
];

const registros = [];
const anomalias = [];

for (const item of arquivos) {
    const caminho = path.join(
        __dirname,
        "..",
        "dados",
        item.arquivo
    );

    const conteudo = fs.readFileSync(caminho, "utf-8");

    const dados = parse(conteudo, {
        columns: true,
        delimiter: ";",
        skip_empty_lines: true,
        trim: true
    });

    for (const registro of dados) {
        registros.push({
            cd: item.cd,
            ...registro,
            codigo: normalizarCodigo(registro.codigo),
            validade: normalizarData(registro.validade),
            saldo: converterValor(registro.saldo),
            vendas_mes_ant: converterValor(registro.vendas_mes_ant)
        });
    }
}

const resultadoDuplicidades = removerDuplicidades(registros);

registros.length = 0;
registros.push(...resultadoDuplicidades.registrosUnicos);

for (const registro of resultadoDuplicidades.duplicidades) {
    anomalias.push({
        cd: registro.cd,
        codigo: registro.codigo,
        lote: registro.lote,
        tipo: "Duplicidade",
        gravidade: "Alta",
        acao_sugerida: "Verificar origem da duplicidade no WMS e manter apenas uma ocorrência"
    });
}

const divergenciasDescricao = identificarDivergenciasDescricao(registros);

for (const divergencia of divergenciasDescricao) {
    anomalias.push({
        cd: "Múltiplos CDs",
        codigo: divergencia.codigo,
        lote: "",
        tipo: "Divergência de descrição",
        gravidade: "Média",
        acao_sugerida: "Padronizar descrição do produto conforme cadastro da matriz"
    });
}


for (const registro of registros) {
    if (!validarCodigo(registro.codigo)) {
        anomalias.push({
            cd: registro.cd,
            codigo: registro.codigo,
            lote: registro.lote,
            tipo: "Código inválido",
            gravidade: "Alta",
            acao_sugerida: "Verificar e corrigir o código do produto"
        });
    }

    if (!validarLote(registro.lote)) {
        anomalias.push({
            cd: registro.cd,
            codigo: registro.codigo,
            lote: registro.lote,
            tipo: "Lote ausente",
            gravidade: "Alta",
            acao_sugerida: "Notificar estoque para informar o lote do produto"
        });
    }

    if (!validarSaldo(registro.saldo)) {
        anomalias.push({
            cd: registro.cd,
            codigo: registro.codigo,
            lote: registro.lote,
            tipo: "Saldo negativo",
            gravidade: "Alta",
            acao_sugerida: "Notificar estoque para verificar o saldo do produto"
        });
    }

    if (!validarData(registro.validade)) {
        anomalias.push({
            cd: registro.cd,
            codigo: registro.codigo,
            lote: registro.lote,
            tipo: "Data inválida",
            gravidade: "Alta",
            acao_sugerida: "Verificar e corrigir a data de validade do produto"
        });
    }

    if (estaVencido(registro.validade)) {
        anomalias.push({
            cd: registro.cd,
            codigo: registro.codigo,
            lote: registro.lote,
            tipo: "Produto vencido",
            gravidade: "Alta",
            acao_sugerida: "Retirar produto do estoque"
        });
    }

    if (estaPertoDaValidade(registro.validade)) {
        anomalias.push({
            cd: registro.cd,
            codigo: registro.codigo,
            lote: registro.lote,
            tipo: "Produto próximo da validade",
            gravidade: "Média",
            acao_sugerida: "Avaliar prioridade de venda ou movimentação do lote"
        });
    }

}

const consolidado = consolidarProdutos(registros);

const conteudoConsolidado = stringify(consolidado, {
    header: true,
    delimiter: ";"
});

const caminhoConsolidado = path.join(
    __dirname,
    "..",
    "consolidado.csv"
);

fs.writeFileSync(
    caminhoConsolidado,
    "\uFEFF" + conteudoConsolidado,
    "utf-8"
);
console.log("Arquivo consolidado.csv gerado com sucesso!");


const conteudoAnomalias = stringify(anomalias, {
    header: true,
    delimiter: ";",
    columns: [
        "cd",
        "codigo",
        "lote",
        "tipo",
        "gravidade",
        "acao_sugerida"
    ]
});

const caminhoAnomalias = path.join(
    __dirname,
    "..",
    "anomalias.csv"
);

fs.writeFileSync(
    caminhoAnomalias,
    "\uFEFF" + conteudoAnomalias,
    "utf-8"
);

console.log("Arquivo anomalias.csv gerado com sucesso!");


console.log(`Total de registros: ${registros.length}`);
console.log(registros);

console.log("Anomalias encontradas:");
console.log(anomalias);

console.log("Consolidado:");
console.log(consolidado);