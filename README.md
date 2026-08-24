# Consolidação de Estoque WMS

Projeto desenvolvido para consolidar os arquivos de estoque dos centros de distribuição de Campinas, Belo Horizonte, São Caetano e Londrina.

A execução gera dois arquivos:

* `consolidado.csv`
* `anomalias.csv`

## Requisitos

Para executar o projeto é necessário ter instalado:

* Node.js
* npm

Para verificar se estão instalados, execute no terminal:

```bash
node -v
npm -v
```

## Como executar

### 1. Baixar o projeto

Clone o repositório:

```bash
git clone <URL_DO_REPOSITORIO>
```

Entre na pasta do projeto:

```bash
cd teste-tecnico
```

Caso o projeto tenha sido baixado como `.zip`, basta extrair o arquivo e abrir um terminal na pasta `teste-tecnico`.

### 2. Instalar as dependências

Na raiz do projeto, execute:

```bash
npm install
```

Esse comando instalará as dependências registradas no `package.json`.

### 3. Conferir os arquivos de entrada

Os quatro arquivos CSV devem estar dentro da pasta `dados/`:

```text
dados/
├── estoque_campinas.csv
├── estoque_bh.csv
├── estoque_sao_caetano.csv
└── estoque_londrina.csv
```

Os arquivos devem utilizar `;` como separador e possuir as colunas:

```text
codigo;descricao;lote;validade;saldo;vendas_mes_ant
```

### 4. Executar o processamento

Na raiz do projeto, execute:

```bash
node src/index.js
```

Exemplo:

```text
teste-tecnico> node src/index.js
```

O programa fará a leitura dos quatro arquivos, executará as validações e a consolidação dos dados e gerará os arquivos de saída.

### 5. Arquivos gerados

Após a execução, serão criados ou atualizados na raiz do projeto:

```text
teste-tecnico/
├── consolidado.csv
└── anomalias.csv
```

`consolidado.csv` contém o estoque consolidado por produto e por centro de distribuição.

`anomalias.csv` contém as inconsistências encontradas durante o processamento, juntamente com a gravidade e uma ação sugerida.

## Executando com novos arquivos

Para processar uma nova extração dos estoques:

1. Substitua os quatro arquivos existentes dentro da pasta `dados/` pelos novos arquivos.
2. Mantenha os mesmos nomes dos arquivos.
3. Mantenha a estrutura de colunas esperada.
4. Execute novamente:

```bash
node src/index.js
```

Os arquivos `consolidado.csv` e `anomalias.csv` serão gerados novamente com base nos novos dados.

> Antes de executar novamente, certifique-se de que `consolidado.csv` e `anomalias.csv` não estejam abertos no Excel ou em outro programa que possa bloquear a gravação dos arquivos.


## Documentação

As decisões tomadas durante o desenvolvimento, premissas, tratamento das anomalias, uso de IA e melhorias futuras estão documentadas em:

```text
DECISOES.md
```

A revisão do código de produção proposta no teste está documentada em:

```text
REVISAO.md
```
