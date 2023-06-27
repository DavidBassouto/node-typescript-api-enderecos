/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { Request, Response } from "express";
import oracle from "oracledb";

const app = express();
app.use(express.json());

let conexao: any = null;

async function abrirConexao() {
  if (conexao == null) {
    console.log("TENTANDO ABRIR CONEXÃO...");
    conexao = await oracle.getConnection({
      user: "C##NODE",
      password: "node",
      connectionString: "localhost:1521/XE",
    });
    console.log("ABRIU CONEXÃO");
  }
}

async function fecharConexao() {
  if (conexao != null) {
    console.log("TENTANDO FECHAR CONEXÃO...");
    conexao.close();
    conexao = null;
    console.log("FECHAR CONEXÃO");
  }
}

async function gerarSequence(nomeSequence: string) {
  const sqlSequence =
    "SELECT " + nomeSequence + ".NEXTVAL AS CODIGO FROM DUAL";
  const resultSet = await conexao.execute(sqlSequence);
  const sequence = resultSet.rows[0][0];
  console.log(
    "SEQUENCE GERADA PARA " + nomeSequence + " - " + sequence,
  );
  return sequence;
}

async function commit() {
  if (conexao != null) {
    await conexao.commit();
  }
}

async function rollback() {
  if (conexao != null) {
    await conexao.rollback();
  }
}

app.get("/uf", function (request, response) {
  return consultarUF(request, response);
});

app.post("/uf", async (request, response) => {
  return await adicionarUF(request, response);
});

async function adicionarUF(request: Request, response: Response) {
  try {
    //CAPTURAR OS DADOS QUE VIERAM DA REQUISIÇÃO (FORMATO JSON)
    const ufVo = request.body;
    //ABRIR A CONEXÃO
    await abrirConexao();
    //GERAR UM CÓDIGO POR MEIO DE UMA SEQUENCE
    ufVo.codigoUF = await gerarSequence("SEQUENCE_UF");
    //GERAR O MEU SQL PARA MANDAR GRAVAR NO BANCO DE DADOS
    const sql =
      "INSERT INTO TB_UF (CODIGO_UF, SIGLA, NOME, STATUS) VALUES (:codigoUF, :sigla, :nome, :status)";
    //MANDAR EXECUTAR O MEU SQL PARA GRAVAR
    const resultSet = await conexao.execute(sql, ufVo);
    //VALIDAR SE OS REGISTROS FORAM INSERIDOS OU NÃO
    console.log(
      "FORAM INSERIDOS " +
        resultSet.rowsAffected +
        " REGISTROS NO BANCO DE DADOS",
    );
    //COMMITAR - MANDAR O BANCO GRAVAR REALMENTE O QUE O SQL MANDOU
    await commit();
    await consultarUF(request, response);
  } catch (err) {
    console.log(err);
    await rollback();
    const jsonRetorno = {
      status: 404,
      mensagem: "Não foi possível incluir UF no banco de dados.",
    };
    return response.status(404).json(jsonRetorno);
  } finally {
    //FECHAR A CONEXAO
    await fecharConexao();
  }
}

async function consultarUF(request: Request, response: Response) {
  const listaUFs = [];
  await abrirConexao();
  const sql = "SELECT CODIGO_UF, SIGLA, NOME, STATUS FROM TB_UF";
  const resultado = await conexao.execute(sql);
  let numeroLinha = 0;
  let numeroColuna = 0;
  const quantidadeResultados = resultado.rows.length;

  while (numeroLinha < quantidadeResultados) {
    const ufVo = {
      codigoUF: resultado.rows[numeroLinha][numeroColuna++],
      sigla: resultado.rows[numeroLinha][numeroColuna++],
      nome: resultado.rows[numeroLinha][numeroColuna++],
      status: resultado.rows[numeroLinha][numeroColuna++],
    };
    listaUFs.push(ufVo);
    numeroLinha++;
    numeroColuna = 0;
  }
  console.log(resultado.rows);
  await fecharConexao();
  response.status(200).json(listaUFs);
}

app.listen(3333, () => {
  console.log("O SERVIDOR FOI INICIADO COM SUCESSO..");
});
