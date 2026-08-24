# Revisão de Código — `sync_wms.js`

O arquivo `sync_wms.js` executa diariamente às 03:00, consulta os saldos do ERP e envia ajustes de divergência para o WMS.

Os problemas abaixo foram ordenados considerando o impacto que poderiam causar ao negócio.

---

## 1. Limite de 1000 registros sem paginação

**Gravidade: Crítica**

A consulta ao ERP possui:

```js
params: { centro: cd, limit: 1000 }
```

Porém, não existe paginação. Como o próprio arquivo informa que cerca de 40 mil itens são processados por execução, parte dos produtos pode nunca ser consultada.

**Consequência às 03h de um sábado:** a sincronização pode terminar com a mensagem de sucesso mesmo deixando milhares de produtos sem verificar e, consequentemente, sem corrigir suas divergências.

**Onde apareceria:** principalmente em produção ou em um teste com mais de 1000 registros.

---

## 2. Atribuição no lugar de comparação

**Gravidade: Crítica**

A condição:

```js
if (item.status = "ATIVO")
```

atribui `"ATIVO"` ao status em vez de verificar seu valor.

O correto seria:

```js
if (item.status === "ATIVO")
```

**Consequência às 03h de um sábado:** produtos inativos podem receber ajustes de estoque indevidamente.

**Onde apareceria:** facilmente em um teste local com um produto de status `"INATIVO"`.

---

## 3. Lote localizado apenas pelo código do produto

**Gravidade: Alta**

O lote é encontrado utilizando:

```js
lotes.find((l) => l.codigo_produto === item.codigo);
```

Como um produto pode possuir vários lotes, o `.find()` retorna apenas o primeiro encontrado.

**Consequência às 03h de um sábado:** um ajuste pode ser enviado para o lote errado, deixando a divergência original sem correção e possivelmente criando outra.

**Onde apareceria:** em teste local com um produto que possua mais de um lote.

---

## 4. Erros são ignorados

**Gravidade: Alta**

O código possui:

```js
catch (e) {}
```

Qualquer erro no processamento de um item é ignorado, sem log ou aviso.

**Consequência às 03h de um sábado:** vários produtos podem falhar durante a sincronização e, mesmo assim, o programa informar:

```text
Sincronizacao concluida com sucesso
```

**Onde apareceria:** tanto localmente quanto em produção.

---

## 5. Token do WMS exposto no código

**Gravidade: Alta**

A credencial de produção está diretamente no código:

```js
const WMS_TOKEN = "wms_live_...";
```

Isso expõe uma informação sensível para qualquer pessoa que tenha acesso ao código.

Uma alternativa seria utilizar variável de ambiente:

```js
const WMS_TOKEN = process.env.WMS_TOKEN;
```

**Consequência prática:** em caso de compartilhamento ou vazamento do código, a credencial também pode ser comprometida.

**Onde apareceria:** imediatamente durante uma revisão local.

---

## 6. Saldo sem validação

**Gravidade: Média**

A conversão utiliza somente:

```js
parseFloat(valor);
```

Um valor inválido pode resultar em `NaN` e comprometer o cálculo da diferença.

**Consequência às 03h de um sábado:** determinado produto pode não ser sincronizado corretamente e, devido ao `catch` vazio, o erro pode passar despercebido.

**Onde apareceria:** teste local com um saldo inválido.

---

## 7. Validade sem validação

**Gravidade: Média**

A validade é convertida diretamente:

```js
new Date(lote.validade).toISOString()
```

Uma data inválida pode gerar uma exceção.

**Consequência às 03h de um sábado:** o ajuste daquele produto pode não ser enviado e o erro será ignorado.

**Onde apareceria:** teste local com uma data inválida.

---

## 8. Produto sem lote é ignorado

**Gravidade: Média**

Quando o lote não é encontrado:

```js
if (!lote) continue;
```

o produto é ignorado sem qualquer registro.

**Consequência às 03h de um sábado:** uma inconsistência entre ERP e WMS pode permanecer sem correção e sem nenhum alerta.

**Onde apareceria:** teste local com um produto sem lote correspondente.

---

## 9. Processamento sequencial

**Gravidade: Média**

Cada ajuste aguarda o anterior terminar:

```js
await enviarAjuste(...)
```

Com aproximadamente 40 mil itens, isso pode aumentar bastante o tempo de execução.

Uma melhoria futura seria estudar processamento em lotes ou concorrência controlada, sem disparar milhares de requisições simultaneamente.

**Onde apareceria:** principalmente em produção ou teste de carga.

---

# Separação dos problemas

### Identificáveis em teste local

- atribuição em vez de comparação do status;
- associação incorreta de lotes;
- erros ignorados;
- token exposto;
- saldo inválido;
- validade inválida;
- produto sem lote correspondente.

### Mais prováveis em produção

- limite de 1000 registros sem paginação;
- lentidão devido ao processamento sequencial de muitos registros.

---

# Reescrita dos dois problemas mais graves

## 1. Paginação da consulta ao ERP

O código atual limita a consulta a 1000 registros. Uma possível correção seria:

```js
async function buscarSaldoERP(cd) {
  const itens = [];
  const limit = 1000;
  let offset = 0;

  while (true) {
    const resp = await axios.get(`${ERP_URL}/estoque`, {
      params: { centro: cd, limit, offset },
    });

    const pagina = resp.data.itens;

    if (!Array.isArray(pagina)) {
      throw new Error(`Resposta inválida do ERP para ${cd}`);
    }

    itens.push(...pagina);

    if (pagina.length < limit) {
      break;
    }

    offset += limit;
  }

  return itens;
}
```

Essa solução considera que a API aceita paginação por `limit` e `offset`. Antes de aplicá-la em produção, eu confirmaria o mecanismo de paginação disponível na API do ERP.

---

## 2. Correção da validação de status

Código atual:

```js
if (item.status = "ATIVO") {
```

Correção:

```js
if (item.status === "ATIVO") {
  await enviarAjuste({
    centro: cd,
    codigo_produto: item.codigo,
    lote: lote.numero,
    validade: new Date(lote.validade).toISOString(),
    quantidade: diferenca,
    origem: "sync_erp",
  });

  console.log(`[${cd}] ajuste enviado: ${item.codigo} ${diferenca}`);
}
```

Dessa forma, somente produtos que realmente possuem status `"ATIVO"` recebem ajustes.

---

# Conclusão

Os problemas mais preocupantes são aqueles que podem gerar uma sincronização incompleta ou alterar estoques incorretamente.

Minha prioridade seria corrigir primeiro a **paginação** e a **validação do status**. Em seguida, trataria a identificação correta dos lotes, o registro de erros e a retirada das credenciais do código-fonte.