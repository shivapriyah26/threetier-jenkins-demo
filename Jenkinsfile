pipeline {
    agent any
    stages {
        stage('Checkout') {
            steps { checkout scm }
        }
        stage('Install Backend Dependencies') {
            steps { dir('backend') { sh 'npm install' } }
        }
        stage('Run Tests') {
            steps { dir('backend') { sh 'npm test' } }
        }
        stage('Deploy') {
            steps {
                sh '''
                  docker compose down || true
                  docker compose up -d --build
                '''
            }
        }
    }
    post {
        success { echo "Deployed. App live on port 80." }
        failure { echo "Pipeline failed — check stage logs." }
    }
}
