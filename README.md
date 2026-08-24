# ClimbMap V1.0

Catálogo estruturado de competências e acompanhamento pessoal de estudos nas áreas de Processos, Sistemas, Dados e Cyber Segurança.

O fluxo da aplicação é: **consultar → planejar → estudar → concluir → acompanhar**.

A base oficial da V1.0 tem 4 áreas, 43 categorias e 295 competências.

Não existe backend, login ou servidor. Todo o progresso pessoal fica no `localStorage` do navegador de cada pessoa.

## Páginas

- **Início**: KPIs, progresso por área, o que está em andamento, fila de estudos e últimas conquistas.
- **Catálogo**: busca e filtros por área, categoria, nível e status. O detalhe de cada competência abre em um painel lateral.
- **Kanban**: colunas Stand By, Em Andamento e Concluído, com competências oficiais e cards pessoais. Aceita arrastar e soltar.
- **Meu Progresso**: resumo por área e mapa completo de competências por categoria e nível.

## Estrutura do projeto

```
/
├── index.html                  estrutura da aplicação
├── README.md
│
├── css/
│   └── styles.css
│
├── js/
│   ├── storage.js              estado pessoal no localStorage
│   ├── data.js                 leitura do catálogo oficial
│   ├── ui.js                   drawer, modais, toasts e badges
│   ├── backup.js               exportar, validar e importar backup
│   ├── views.js                telas
│   └── app.js                  rotas e eventos globais
│
├── data/
│   ├── climbmap-v1.0.js        base oficial convertida (usada pela aplicação)
│   └── ClimbMap_Base_V1_0.xlsx base oficial aprovada (origem da conversão)
│
├── tools/
│   └── convert_base.py         conversor do Excel para o arquivo da base
│
└── assets/icons/
```

## Como publicar no GitHub Pages

1. Crie um repositório novo no GitHub.
2. Suba todos os arquivos deste projeto na raiz do repositório (o `index.html` precisa ficar na raiz).
3. Abra **Settings** no repositório.
4. No menu lateral, clique em **Pages**.
5. Em **Source**, escolha **Deploy from a branch**.
6. Selecione a branch `main`.
7. Selecione a pasta `/ (root)`.
8. Clique em **Save** e aguarde alguns minutos até o endereço aparecer.

Não é necessário build, Node, npm ou qualquer configuração de servidor. A navegação usa hash (`#inicio`, `#catalogo`, `#kanban`, `#progresso`), então atualizar a página não gera 404.

## Onde está a base

O dataset usado pela aplicação é `data/climbmap-v1.0.js`. Ele contém as áreas, categorias e competências exatamente como estão no Excel aprovado, e é carregado como um arquivo JavaScript comum (a aplicação não lê `.xlsx` em tempo de execução).

O arquivo é gerado, não deve ser editado à mão.

## Como atualizar a base futuramente

```
novo Excel aprovado
↓
converter
↓
substituir o arquivo da base
↓
atualizar a versão
```

Na prática:

```bash
python tools/convert_base.py data/ClimbMap_Base_V1_1.xlsx data/climbmap-v1.1.js
```

Depois, troque a referência do arquivo em `index.html` e publique de novo. O campo `Versao` da aba `00_Versao` alimenta o texto "Base V…" exibido na aplicação.

O conversor não altera nomes, descrições, níveis, ordem, campo `Ativo` nem IDs. Ele apenas muda o formato técnico.

## Backup

O progresso fica apenas no navegador em que foi registrado. Limpar os dados do navegador apaga o progresso.

- **Exportar**: menu lateral → **Backup** → **Exportar Backup**. O arquivo é salvo como `climbmap_backup_AAAA-MM-DD.json`.
- **Importar**: menu lateral → **Backup** → **Selecionar arquivo**. A aplicação valida o arquivo, mostra um resumo, pede confirmação e substitui integralmente os dados do navegador. Não existe mesclagem.

Vale exportar um backup antes de trocar de computador ou de navegador.

## Regra dos IDs

O progresso é gravado sempre pelo `Competencia_ID` (`COMP0001`, `COMP0042`, e assim por diante), nunca por nome, posição na lista ou linha do Excel.

Por isso, ao publicar uma nova versão da base:

- IDs já publicados precisam ser preservados;
- IDs removidos não podem ser reutilizados para outra competência.

Seguindo essa regra, um backup criado na V1.0 continua válido em versões futuras: cada progresso volta automaticamente para a competência de mesmo ID. Se um backup trouxer um ID que não existe mais na base, o dado é mantido no estado, apenas sem exibição.
