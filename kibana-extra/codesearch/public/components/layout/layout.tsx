/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DetailSymbolInformation } from '@codesearch/lsp-extension';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';

import { match } from 'react-router-dom';
import { Location } from 'vscode-languageserver';

import { RepositoryUtils } from '../../../common/repository_utils';
import { FileTree as Tree, FileTreeItemType } from '../../../model';
import {
  closeTreePath,
  fetchRepoTree,
  FetchRepoTreePayload,
  searchQueryChanged,
} from '../../actions';
import { RootState } from '../../reducers';

import { history } from '../../utils/url';
import { FileTree } from '../file_tree/file_tree';
import { Editor } from './editor';

import { closeTreePath, fetchRepoTree, FetchRepoTreePayload } from '../../actions';
import { history } from '../../utils/url';
import { SymbolTree } from '../symbol_tree/symbol_tree';
import { LayoutBreadcrumbs } from './layout_breadcrumbs';

enum Tabs {
  FILE_TREE,
  STRUCTURE_TREE,
}

const noMarginStyle = {
  margin: 0,
};

interface State {
  showSearchBox: boolean;
  tab: Tabs;
}
interface Props {
  match: match<{ [key: string]: string }>;
  tree: FileTree;
  openedPaths: string[];
  fetchRepoTree: (payload: FetchRepoTreePayload) => void;
  closeTreePath: (path: string) => void;
  symbols: DetailSymbolInformation[];
  searchQueryChanged: (query: string) => void;
  isSymbolsLoading: boolean;
}

export class LayoutPage extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      showSearchBox: false,
      tab: Tabs.FILE_TREE,
    };
  }

  public componentDidMount() {
    this.fetchTree(this.props.match.params.path);
  }

  public onClick = (node: Tree) => {
    const { resource, org, repo, revision } = this.props.match.params;
    const pathType = node.type === FileTreeItemType.File ? 'blob' : 'tree';
    history.push(`/${resource}/${org}/${repo}/${pathType}/${revision}/${node.path}`);
  };

  public findNode = (pathSegments: string[], node: Tree) => {
    if (!node) {
      return null;
    } else if (pathSegments.length === 0) {
      return node;
    } else if (pathSegments.length === 1) {
      return (node.children || []).find(n => n.name === pathSegments[0]);
    } else {
      const currentFolder = pathSegments.shift();
      return this.findNode(pathSegments, (node.children || []).find(n => n.name === currentFolder));
    }
  };

  public getTreeToggler = (path: string) => () => {
    if (this.props.openedPaths.includes(path)) {
      this.props.closeTreePath(path);
    } else {
      this.fetchTree(path);
    }
  };

  public searchInputOnChangedHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.props.searchQueryChanged(event.target.value);
  };

  public getSymbolLinkUrl = (loc: Location) => {
    return RepositoryUtils.locationToUrl(loc);
  };

  public toggleSearchBox = () => {
    this.setState({ showSearchBox: !this.state.showSearchBox });
  };

  public onChange = (selectedOptions: any[]) => {
    const { symbol } = selectedOptions[0];
    const location = symbol.symbolInformation.location;
    const url = this.getSymbolLinkUrl(location);
    history.push(url);
  };

  public onSearchChange = (searchValue: string) => {
    this.props.searchQueryChanged(searchValue.toLowerCase());
  };

  public onSelectedTabChanged = (tab: Tabs) => {
    this.setState({ tab });
  };

  public renderTabs = () => {
    const clickFileTreeHandler = () => this.onSelectedTabChanged(Tabs.FILE_TREE);
    const clickStructureTreeHandler = () => this.onSelectedTabChanged(Tabs.STRUCTURE_TREE);
    return (
      <React.Fragment>
        <EuiTab onClick={clickFileTreeHandler} isSelected={Tabs.FILE_TREE === this.state.tab}>
          File Tree
        </EuiTab>
        <EuiTab
          onClick={clickStructureTreeHandler}
          isSelected={Tabs.STRUCTURE_TREE === this.state.tab}
        >
          Structure Tree
        </EuiTab>
      </React.Fragment>
    );
  };

  public renderTabContent = () =>
    this.state.tab === Tabs.STRUCTURE_TREE ? (
      <SymbolTree />
    ) : (
      <FileTree
        node={this.props.tree}
        onClick={this.onClick}
        openedPaths={this.props.openedPaths}
        getTreeToggler={this.getTreeToggler}
        activePath={this.props.match.params.path || ''}
      />
    );

  public render() {
    const { symbols, isSymbolsLoading } = this.props;
    const { resource, org, repo, revision, path, goto, pathType } = this.props.match.params;
    const editor = pathType === 'blob' && (
      <Editor
        file={path}
        goto={goto}
        repoUri={`${resource}/${org}/${repo}`}
        revision={revision || 'HEAD'}
      />
    );

    const symbolOptions = symbols.map((symbol: DetailSymbolInformation) => {
      return {
        label: symbol.symbolInformation.name,
        symbol,
      };
    });

    const searchBox = (
      <EuiFlexItem grow={false} style={noMarginStyle}>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          className="topBar"
          direction="column"
          style={noMarginStyle}
        >
          <EuiFlexItem grow={false} style={noMarginStyle}>
            <EuiComboBox
              placeholder="Search..."
              async={true}
              options={symbolOptions}
              isLoading={isSymbolsLoading}
              onChange={this.onChange}
              onSearchChange={this.onSearchChange}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    );

    return (
      <EuiFlexGroup direction="column" className="mainRoot" style={noMarginStyle}>
        {this.state.showSearchBox && searchBox}
        <EuiFlexItem grow={false} style={noMarginStyle}>
          <EuiFlexGroup justifyContent="spaceBetween" className="topBar" style={noMarginStyle}>
            <EuiFlexItem grow={false} style={noMarginStyle}>
              <LayoutBreadcrumbs routeParams={this.props.match.params} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <div>
                <EuiButtonIcon iconType="node" aria-label="node" />
                <EuiButtonIcon iconType="gear" aria-label="config" />
                <EuiButtonIcon
                  iconType="search"
                  aria-label="Toggle Search Box"
                  onClick={this.toggleSearchBox}
                />
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiSpacer size="xs" className="spacer" />
        <EuiFlexItem className="codeMainContainer" style={noMarginStyle}>
          <EuiFlexGroup justifyContent="spaceBetween" className="codeMain">
            <EuiFlexItem grow={false} style={noMarginStyle} className="fileTreeContainer">
              <div>
                <EuiTabs>{this.renderTabs()}</EuiTabs>
              </div>
              {this.renderTabContent()}
            </EuiFlexItem>
            <EuiFlexItem style={noMarginStyle} className="autoOverflow">
              {editor}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  private fetchTree(path = '') {
    const { resource, org, repo, revision } = this.props.match.params;
    this.props.fetchRepoTree({
      uri: `${resource}/${org}/${repo}`,
      revision,
      path,
    });
  }
}

const mapStateToProps = (state: RootState) => ({
  tree: state.file.tree,
  openedPaths: state.file.openedPaths,
  loading: state.file.loading,
  symbols: state.search.symbols,
  isSymbolsLoading: state.search.isLoading,
});

const mapDispatchToProps = {
  fetchRepoTree,
  closeTreePath,
  searchQueryChanged,
};

export const Layout = connect(
  mapStateToProps,
  mapDispatchToProps
)(LayoutPage);
