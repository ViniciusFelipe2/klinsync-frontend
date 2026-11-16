# CME: passo a passo do teste de leitura no hospital

**Objetivo:** descobrir o menor tamanho de código que o leitor lê bem e, principalmente, se ele consegue ler o código gravado a laser nas peças de aço.

**Atenção:** o teste em papel prova só a impressão e a configuração do leitor. Ele **não** prova a leitura no metal. O resultado que decide é o da etapa 5, com peças gravadas de verdade.

## O que levar

- Computador com o KlinSync aberto e o leitor ligado na porta USB.
- Impressora, de preferência laser, com 600 dpi ou mais.
- Régua de verdade.
- 3 a 5 peças de teste já gravadas a laser: uma lisa, uma curva, uma pequena e, se houver, uma gasta.
- Esta folha, para anotar.

## 1. Preparar os acessos (equipe master)

1. Em **Hospitais/Features**, habilite o módulo **CME - Rastreabilidade de materiais** para o hospital.
2. Em **Usuários**, crie um login **Operacional**, vinculado ao módulo CME, para o chefe do CME. Na linha dele, em **Função no CME**, escolha **Chefe do CME**.
3. Para cada computador de sala cirúrgica, crie outro login Operacional do CME e escolha **Computador da Sala X**.

## 2. Cadastrar caixas, itens e colaboradores (chefe do CME)

1. Entre com o login do chefe. O sistema abre a tela **Caixas**.
2. Clique em **Nova caixa**, escreva `Caixa de teste` e salve.
3. Clique na caixa para abrir. Em **Novo item nesta caixa**, inclua `Teste papel`.
4. Para cada peça já gravada: escreva o nome, marque **Já tem código gravado**, digite o código ou bipe a peça e clique em **Incluir**.
5. Em **Colaboradores**, cadastre nome, número do crachá e equipe. Marque e clique em **Imprimir crachás**.

## 3. Imprimir a folha de teste

1. Na caixa aberta, marque só a bolinha de `Teste papel` e clique em **Folha de teste**.
2. Clique em **Imprimir**. Na janela de impressão:
   - Escala em **100%** ou **tamanho real**.
   - **Desmarque "ajustar à página"**, cabeçalhos e rodapés.
   - Use a **melhor qualidade**.
3. **Meça a régua impressa.** Ela precisa dar exatamente 50 mm. Se não der, ajuste a impressão e imprima de novo: uma folha fora de escala invalida o teste.

## 4. Testar no papel

Abra **Teste de leitura**, escolha o tipo de peça **Papel** e informe o tamanho que vai testar.

**Primeiro, confira o leitor.** Bipe o código de 10 mm e olhe o **texto bruto**:

| O que aparece | O que significa | O que fazer |
| --- | --- | --- |
| O código seguido de `[ENTER]`, identificado como "Leitor" | Está tudo certo | Seguir o teste |
| Aviso "sem o Enter no final" | O leitor não envia o Enter | Configurar com o código de programação "Add CR Suffix" do guia do leitor |
| Caracteres trocados ou a mais no início ou no fim | O leitor acrescenta prefixo ou sufixo, ou o teclado está configurado diferente | Anotar o que aparece e me enviar |

**Depois, teste cada tamanho (3, 4, 5, 6, 8 e 10 mm), 10 vezes cada:**

1. Mude o campo **Tamanho do código**.
2. Bipe. Se leu, o sistema registra sozinho.
3. Se não leu na hora, clique em **Tentei e não leu (+1)** e tente de novo.
4. Se depois de várias tentativas não ler, clique em **Desisti: esta peça não lê**.

Anote também a distância e o ângulo em que funcionou melhor.

## 5. Testar nas peças gravadas (a parte que decide)

Repita para cada peça, **10 leituras cada**, escolhendo o tipo certo: **Inox liso**, **Inox curvo**, **Peça pequena** ou **Peça gasta**.

- **Não leu de jeito nenhum?** Escolha a peça na lista antes de clicar em **Desisti**, para a falha contar para ela.
- **Precisou digitar?** Use **Digitar o código à mão** e informe o motivo. Isso conta como falha da peça, não como sucesso do leitor.
- Experimente inclinar a peça e mudar a distância. Brilho e curvatura costumam mudar o resultado.

## 6. Ler o resultado

A tabela **Resultado por tipo de peça**, no fim da tela de teste, mostra a taxa de sucesso, o que leu de primeira, a média de tentativas e o tempo médio. A tela **Falhas de leitura** mostra quais peças falharam mais.

**Sugestão para interpretar. Combine os números finais com a equipe:**

| Taxa de sucesso no inox | Leitura |
| --- | --- |
| Quase todas de primeira | O leitor atende: pode seguir |
| Lê, mas com várias tentativas | Atrasaria o plantão: testar outro tamanho de gravação ou outra qualidade de marcação |
| Quase não lê | O problema é o leitor, que não foi feito para marcação em metal: avaliar um modelo próprio para isso |

## 7. O que me enviar

- [ ] O que apareceu no **texto bruto** na primeira leitura.
- [ ] Foto ou Excel da tabela **Resultado por tipo de peça**.
- [ ] Menor tamanho que leu bem no papel: ______ mm.
- [ ] Menor tamanho que leu bem no metal: ______ mm.
- [ ] Modelo e formato de arquivo que a empresa de gravação aceita (planilha, SVG ou outro).
- [ ] Tamanho real do quadradinho gravado, segundo a empresa de gravação: ______ mm.
