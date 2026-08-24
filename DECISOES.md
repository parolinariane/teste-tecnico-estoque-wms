# DECISÕES

## a) Perguntas

Antes de iniciar, algumas regras de negócio não estavam totalmente definidas no enunciado. As principais perguntas que eu faria seriam:

* Quando o mesmo produto aparece mais de uma vez no mesmo CD, mas em lotes diferentes, os saldos dos lotes devem ser somados para formar o saldo daquele produto no CD?
* Como devemos tratar registros duplicados do mesmo produto e lote? Devemos somar os valores, manter apenas uma ocorrência ou bloquear o processamento?
* Um lote vencido ainda deve participar do `saldo_total`?
* Como deve ser tratada uma data de validade ausente ou que não existe no calendário?
* Existe uma regra oficial para definir quando um produto está próximo da validade? Quantos dias ou meses devem ser considerados?
* O que deve acontecer quando um produto possui saldo negativo?
* Como deve ser tratado um produto cujo lote não foi informado?
* Quando o mesmo código possui descrições diferentes entre os CDs, qual descrição deve ser utilizada no consolidado?
* Vendas iguais a zero devem ser consideradas uma anomalia ou podem representar uma situação normal, como um produto novo ou sem movimentação naquele mês?
* Seria interessante também disponibilizar a cobertura em dias, além da cobertura em meses, para facilitar a interpretação operacional?

---

## b) Premissas

Como não havia resposta para todas as perguntas acima, adotei algumas premissas para evitar decisões silenciosas ou apenas ignorar as situações. 

### Saldo por lote

Cada linha representa o saldo de um lote. Portanto, quando um produto possui vários lotes dentro do mesmo CD, os saldos dos lotes válidos são somados para obter o saldo daquele produto no CD.

O campo `vendas_mes_ant`, por outro lado, representa as vendas do produto naquele CD e não as vendas específicas do lote. Por esse motivo, esse valor é contabilizado apenas uma vez para cada combinação de produto e CD.

### Códigos dos produtos

O ERP trabalha com códigos de 7 dígitos. Os códigos com menos de 7 dígitos são normalizados com zeros à esquerda.

Exemplo:

`74500` → `0074500`

Os códigos são tratados como texto, pois os zeros à esquerda fazem parte do identificador.

### Duplicidades

Registros duplicados são considerados erro de qualidade dos dados.

Quando uma ocorrência duplicada é identificada, apenas uma delas é utilizada na consolidação para evitar que o estoque seja contabilizado duas vezes.

A ocorrência também é registrada em `anomalias.csv`, com a sugestão de verificar sua origem no WMS.

### Produtos vencidos

Foi assumido que produtos vencidos não representam estoque disponível.

Como o contexto envolve produtos farmacêuticos e de beleza, lotes cuja validade seja anterior à data de extração são retirados do cálculo do saldo disponível e, consequentemente, do `saldo_total`.

Esses lotes continuam sendo registrados em `anomalias.csv`, para que a operação possa tomar as providências necessárias.

A data utilizada como referência é **20/08/2026**, conforme informado no enunciado.

### Datas

Os arquivos apresentaram datas em formatos diferentes.

Foi adotado `DD/MM/AAAA` como formato interno padrão. Datas no formato `AAAA-MM-DD` são convertidas antes das validações. Um formato diferente não é considerado automaticamente uma anomalia.

São consideradas inválidas apenas datas que não existem no calendário, como `31/02/2026`.

### Saldo negativo

Saldo negativo não foi considerado estoque disponível.

Quando encontrado, o saldo considerado na consolidação é zero, mas o valor original permanece identificável nos dados de origem e a ocorrência é registrada em `anomalias.csv`.

A intenção é não permitir que um saldo negativo reduza artificialmente o estoque disponível de outros CDs, ao mesmo tempo em que o problema operacional continua visível.

### Lote ausente

A ausência do lote é registrada como anomalia, porém o saldo do registro continua sendo considerado.

A premissa adotada foi que a ausência da identificação do lote é um problema de qualidade do dado, mas não significa necessariamente que o estoque informado não exista.

A ação sugerida é que a equipe de estoque verifique e complete a informação no WMS.

### Divergência de descrição

Inicialmente considerei escolher a descrição que aparecesse com maior frequência entre os CDs. Entretanto, essa regra não resolve situações de empate. Por isso, foi adotada como referência a descrição cadastrada em **Campinas**, considerada a matriz. Caso o produto não exista em Campinas, é utilizada como fallback a primeira descrição disponível encontrada para o código.

As divergências continuam sendo registradas em `anomalias.csv`, pois indicam falta de padronização cadastral entre os CDs.

### Produtos próximos da validade

Como o enunciado não define uma janela para "próximo da validade", foi adotada como premissa uma janela de **180 dias a partir da data de extração**.

Produtos que já estão vencidos não entram nessa classificação, pois são tratados separadamente.

Esses registros são sinalizados como anomalia operacional para permitir priorização de venda, transferência ou outra ação antes do vencimento.

### Vendas zeradas

Vendas iguais a zero não foram consideradas automaticamente uma anomalia. Um produto pode ser novo, sazonal ou simplesmente não ter apresentado vendas no mês anterior.

O valor continua sendo tratado pelo sistema e, caso `vendas_mes_ant_total` seja zero, `cobertura_meses` recebe `null`, evitando divisão por zero.

### Cobertura de estoque

A cobertura é calculada por:

`saldo_total / vendas_mes_ant_total`

O resultado é arredondado para duas casas decimais.

Apesar de `cobertura_meses` ser o campo solicitado no teste, considero que uma medida adicional em dias seria mais intuitiva para usuários operacionais. Por exemplo, uma cobertura de `0,36` mês corresponde aproximadamente a 11 dias.

---

## c) Anomalias

### Registro duplicado — Belo Horizonte

Foi encontrado um registro duplicado para o produto `0074500`, lote `L2401`, em Belo Horizonte. As duas ocorrências possuíam os mesmos dados, incluindo validade, saldo e vendas.

O problema foi identificado ao comparar a combinação de CD, código, lote e validade. A duplicidade poderia fazer o saldo ser contabilizado duas vezes. Por isso, apenas uma ocorrência foi mantida na consolidação e a outra foi registrada como anomalia.

A ação sugerida é verificar a origem da duplicidade no WMS e manter apenas uma ocorrência.

### Divergência de descrição — produto 0074500

O produto `0074500` aparece com descrições diferentes entre os CDs.

Exemplos encontrados:

* `DIPIRONA SODICA 500MG CX 20CP`
* `Dipirona Sodica 500mg cx 20cp`
* `DIPIRONA 500 MG - CX C/20`

A divergência foi identificada agrupando os registros pelo código e comparando suas descrições.

Foi utilizada no consolidado a descrição cadastrada em Campinas, seguindo a premissa de considerar a matriz como referência. A divergência foi mantida em `anomalias.csv`, pois indica falta de padronização cadastral.

### Divergência de descrição — produto 0102440

O produto `0102440` também possui descrições diferentes:

* `PROTETOR SOLAR FPS50 200ML`
* `Protetor Solar FPS 50 - 200ML`

Foi aplicada a mesma regra: utilizar a descrição de Campinas e registrar a divergência para possível padronização dos cadastros.

### Produto vencido — Campinas

Foi encontrado o produto `0074500`, lote `L2311`, com validade em `30/09/2025`.

Como a data de extração é `20/08/2026`, o lote já estava vencido. Seu saldo de 90 unidades não foi considerado no saldo disponível de Campinas nem no `saldo_total`.

A ação sugerida é retirar ou bloquear o lote no estoque.

### Produto vencido — São Caetano

O produto `0102440`, lote `L2309`, possui validade em `31/12/2025`.

O saldo de 45 unidades também foi desconsiderado do estoque disponível e registrado como anomalia.

### Lote ausente — Campinas

O produto `0102440` apresentou saldo de 610 unidades e validade informada, porém sem identificação de lote. Como não havia evidência suficiente para afirmar que o saldo não existe, o registro foi mantido na consolidação.

A ausência do lote foi sinalizada para que a equipe de estoque corrija o cadastro.

### Saldo negativo — Londrina

O produto `0067890`, lote `L2404`, apresentou saldo de `-35`.

Como estoque disponível negativo não é considerado válido para a consolidação, foi utilizado saldo zero para esse registro.

A ocorrência foi mantida em `anomalias.csv` para que o estoque verifique a causa do saldo negativo no WMS.

### Produtos próximos da validade

Também foram encontrados lotes cuja validade estava dentro da janela de 180 dias adotada. Esses produtos não foram retirados do estoque, pois ainda estavam válidos.

Foram apenas sinalizados para permitir que a operação avalie prioridade de venda, transferência ou outra movimentação antes do vencimento.

---

## d) Uso de IA

Utilizei ChatGPT durante o desenvolvimento principalmente como apoio para discutir regras, revisar decisões e estruturar algumas partes da implementação.

Um caso concreto em que a IA ajudou foi na identificação de que `vendas_mes_ant` não deveria ser somado uma vez para cada lote. O próprio dicionário de dados informa que esse campo representa as vendas do produto naquele CD. A implementação passou então a contabilizar as vendas apenas uma vez por combinação de código e CD.

Também utilizei IA para revisar o tratamento dos códigos e dos arquivos CSV, incluindo o separador `;`, conversão dos valores no formato brasileiro e normalização dos códigos para 7 dígitos.

Entretanto, houve situações em que precisei revisar as sugestões da IA.

### Uso incorreto da data atual

Inicialmente foi sugerido utilizar `new Date()` para determinar se um produto estava vencido.

Isso faria o resultado depender da data em que o programa fosse executado.

Ao revisar o enunciado, percebi que havia uma regra explícita informando que **20/08/2026 deveria ser considerada como "hoje" para qualquer cálculo de validade**.

A implementação foi corrigida para utilizar a data de extração fornecida pelo teste, tornando o processamento reproduzível.

### Vendas zeradas como anomalia

Em um primeiro momento, a IA sugeriu registrar vendas zeradas como uma anomalia.

Ao analisar melhor o contexto, percebi que vendas iguais a zero não representam necessariamente um problema. O produto pode ser novo, sazonal ou simplesmente não ter tido movimentação no mês anterior.

Por isso, retirei essa classificação do `anomalias.csv` e mantive apenas o tratamento matemático necessário para evitar divisão por zero no cálculo da cobertura.

Esses casos reforçaram a necessidade de utilizar IA como ferramenta de apoio, mas sempre validar suas sugestões contra o enunciado, os dados e as regras de negócio.

---

## e) Dívida

Com mais uma semana, eu priorizaria as seguintes melhorias:

### Testes automatizados

Criaria testes automatizados para as principais regras:

* normalização de códigos;
* conversão de valores;
* datas válidas e inválidas;
* produtos vencidos;
* saldo negativo;
* duplicidades;
* divergência de descrição;
* cálculo de saldo por CD;
* cálculo de vendas;
* cálculo de cobertura.

Isso reduziria o risco de regressões quando novos arquivos fossem processados.

### Cobertura em dias

Apesar de `cobertura_meses` ser o campo solicitado, adicionaria uma visualização ou coluna auxiliar de `cobertura_dias`.

Valores como `0,36 mês` são menos intuitivos para usuários operacionais do que aproximadamente `11 dias`.

### Estoque mínimo e reposição

Como foi encontrado um produto com saldo negativo, uma evolução seria permitir definir um estoque mínimo por produto.

Quando o estoque atingisse esse limite, o sistema poderia:

* gerar um alerta para a equipe de estoque;
* sinalizar necessidade de reposição;
* eventualmente gerar automaticamente uma solicitação de compra, dependendo das regras internas da empresa.

### Padronização cadastral

A divergência de descrição entre CDs indica que os cadastros não estão totalmente padronizados.

Como melhoria, avaliaria centralizar a descrição oficial do produto no ERP, evitando que cada CD mantenha variações independentes.
